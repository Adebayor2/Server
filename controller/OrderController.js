import crypto from "node:crypto";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import Product from "../models/Products.js";
import User from "../models/User.js";
import DeliverySettings from "../models/DeliverySettings.js";
import {
  getDeliveryFee,
  PICKUP_ADDRESS,
} from "../config/deliveryOptions.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  initializePayment,
  verifyPayment,
} from "../services/flutterwaveService.js";

const getPageOptions = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const normalizeShippingAddress = (address = {}, user) => ({
  firstName: address.firstName || user?.firstName,
  lastName: address.lastName || user?.lastName,
  email: address.email || user?.email,
  phone: address.phone || user?.phone,
  address: address.address || user?.address || "",
  city: address.city,
  state: address.state,
  country: address.country || "Nigeria",
});

const buildOrder = async (req, paymentMethod) => {
  const body = req.body || {};
  const user = req.user ? await User.findById(req.user._id) : null;
  if (req.user && !user) throw new ApiError(404, "User not found");

  const { items: requestedItems, fulfillmentMethod } = body;
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }
  if (!["delivery", "pickup"].includes(fulfillmentMethod)) {
    throw new ApiError(400, "Choose delivery or store pickup");
  }

  const submittedAddress =
    body.shippingAddress &&
    typeof body.shippingAddress === "object" &&
    !Array.isArray(body.shippingAddress)
      ? body.shippingAddress
      : {};
  const shippingAddress = normalizeShippingAddress(submittedAddress, user);
  const requiredAddressFields = ["firstName", "lastName", "email", "phone"];
  if (fulfillmentMethod === "delivery") {
    requiredAddressFields.push("address", "city", "state");
  }
  if (
    requiredAddressFields.some(
      (field) =>
        typeof shippingAddress[field] !== "string" ||
        !shippingAddress[field].trim()
    )
  ) {
    throw new ApiError(400, "Complete shipping details are required");
  }

  const quantities = new Map();
  for (const item of requestedItems) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.productId !== "string" ||
      !/^[a-f\d]{24}$/i.test(item.productId) ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
    ) {
      throw new ApiError(400, "Cart contains an invalid product or quantity");
    }
    const productId = item.productId.toLowerCase();
    quantities.set(
      productId,
      (quantities.get(productId) || 0) + Number(item.quantity)
    );
  }

  const productIds = [...quantities.keys()];
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });
  if (products.length !== productIds.length) {
    throw new ApiError(409, "A product in your cart is no longer available");
  }

  const items = [];
  let subtotal = 0;
  for (const product of products) {
    const quantity = quantities.get(product._id.toString());
    if (quantity > product.stock) {
      throw new ApiError(409, `${product.title} does not have enough stock`);
    }

    const unitPrice =
      product.discountPrice > 0 ? product.discountPrice : product.price;
    items.push({
      product: product._id,
      title: product.title,
      slug: product.slug,
      image: product.images[0]?.url || "",
      sku: product.sku,
      unitPrice,
      quantity,
    });
    subtotal += unitPrice * quantity;
  }

  let deliveryFee = 0;
  if (fulfillmentMethod === "delivery") {
    const deliverySettings = await DeliverySettings.findOne({
      key: "delivery",
    }).lean();
    const savedFees = Object.fromEntries(
      (deliverySettings?.fees || []).map(({ state, fee }) => [state, fee])
    );
    const delivery = getDeliveryFee(shippingAddress.state, savedFees);
    shippingAddress.state = delivery.state;
    deliveryFee = delivery.fee;
  }

  const order = await Order.create({
    ...(user ? { user: user._id } : {}),
    items,
    fulfillmentMethod,
    deliveryFee,
    pickupLocation: fulfillmentMethod === "pickup" ? PICKUP_ADDRESS : "",
    shippingAddress,
    subtotal,
    total: subtotal + deliveryFee,
    paymentMethod,
  });

  return { order, user, shippingAddress };
};

export const initializeFlutterwavePayment = asyncHandler(async (req, res) => {
  const { order, shippingAddress } = await buildOrder(req, "flutterwave");
  const reference = `sp-${crypto.randomUUID()}`;
  order.paymentReference = reference;
  await order.save();

  const configuredClientOrigin = (process.env.CLIENT_URI || "")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean);
  if (!configuredClientOrigin) {
    order.paymentStatus = "failed";
    await order.save();
    throw new ApiError(503, "Client URL is not configured for payment return");
  }

  let paymentLink;
  try {
    const redirectUrl = new URL(
      "/checkout/payment-result",
      configuredClientOrigin
    );
    redirectUrl.searchParams.set("order_ref", reference);

    paymentLink = await initializePayment({
      reference,
      amount: order.total,
      email: shippingAddress.email,
      name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      phone: shippingAddress.phone,
      redirectUrl: redirectUrl.toString(),
      orderId: order._id.toString(),
    });
  } catch (error) {
    order.paymentStatus = "failed";
    await order.save();
    throw error;
  }

  return res.status(201).json({
    success: true,
    message: "Flutterwave payment initialized",
    data: {
      orderId: order._id,
      paymentReference: reference,
      paymentLink,
    },
  });
});

export const verifyFlutterwavePayment = asyncHandler(async (req, res) => {
  const reference = req.body?.tx_ref;
  const transactionId = req.body?.transaction_id;
  if (typeof reference !== "string" || !reference) {
    throw new ApiError(400, "Payment reference is required");
  }
  if (!transactionId) {
    throw new ApiError(400, "Flutterwave transaction ID is required");
  }

  const order = await Order.findOne({ paymentReference: reference });
  if (!order) throw new ApiError(404, "Payment order not found");
  if (order.paymentStatus === "paid") {
    return res.status(200).json({
      success: true,
      message: "Payment already verified",
      data: { order, isPaid: true },
    });
  }

  const transaction = await verifyPayment(transactionId);
  if (String(transaction.tx_ref) !== reference) {
    throw new ApiError(400, "Flutterwave transaction reference does not match");
  }
  if (String(transaction.id) !== String(transactionId)) {
    throw new ApiError(400, "Flutterwave transaction ID does not match");
  }
  if (String(transaction.status).toLowerCase() !== "successful") {
    order.paymentStatus = "failed";
    await order.save();
    return res.status(200).json({
      success: true,
      message: "Payment was not successful",
      data: { order, isPaid: false },
    });
  }
  if (
    String(transaction.currency).toUpperCase() !== "NGN" ||
    Number(transaction.amount) !== order.total
  ) {
    throw new ApiError(400, "Flutterwave payment amount or currency does not match");
  }

  order.paymentStatus = "paid";
  order.paymentTransactionId = String(transaction.id || transactionId);
  await order.save();

  if (order.user) {
    await User.updateOne(
      { _id: order.user },
      { $pull: { cart: { product: { $in: order.items.map((item) => item.product) } } } }
    );
  }

  return res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    data: { order, isPaid: true },
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPageOptions(req.query);
  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort("-createdAt").skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Orders retrieved successfully",
    data: {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export const trackGuestOrder = asyncHandler(async (req, res) => {
  const orderReference = req.body?.orderReference;
  const email = req.body?.email;
  if (typeof orderReference !== "string" || !/^[a-f\d]{24}$/i.test(orderReference)) {
    throw new ApiError(400, "Enter a valid order reference");
  }
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new ApiError(400, "Enter the email address used at checkout");
  }

  const order = await Order.findOne({
    _id: orderReference,
    user: { $exists: false },
    "shippingAddress.email": email.trim().toLowerCase(),
  }).select(
    "_id items.title items.sku items.quantity items.unitPrice fulfillmentMethod deliveryFee pickupLocation shippingAddress.firstName shippingAddress.city shippingAddress.state subtotal total paymentMethod paymentStatus status createdAt"
  );

  if (!order) {
    throw new ApiError(404, "We could not find an order matching those details");
  }

  return res.status(200).json({
    success: true,
    message: "Guest order retrieved successfully",
    data: { order },
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  }).populate("items.product", "title slug images sku");

  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json({
    success: true,
    message: "Order retrieved successfully",
    data: { order },
  });
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPageOptions(req.query);
  const filter = {};

  if (req.query.status) {
    if (!ORDER_STATUSES.includes(req.query.status)) {
      throw new ApiError(400, "Invalid order status");
    }
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "firstName lastName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Orders retrieved successfully",
    data: {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { status },
    { new: true, runValidators: true }
  );
  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json({
    success: true,
    message: "Order status updated successfully",
    data: { order },
  });
});
