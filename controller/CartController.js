import User from "../models/User.js";
import Product from "../models/Products.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("cart.product");
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json({
    success: true,
    message: "Cart retrieved successfully",
    data: { cart: user.cart },
  });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) throw new ApiError(400, "Product ID is required");

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or unavailable");
  }
  if (product.stock < 1) throw new ApiError(409, "Product is out of stock");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const requestedQuantity = Math.max(1, Number(quantity) || 1);
  const existingItem = user.cart.find(
    (item) => item.product.toString() === productId
  );
 
  if (existingItem) {
    existingItem.quantity = Math.min(
      product.stock,
      existingItem.quantity + requestedQuantity
    );
  } else {
    user.cart.push({
      product: product._id,
      quantity: Math.min(product.stock, requestedQuantity),
    });
  }

  await user.save();
  await user.populate("cart.product");

  return res.status(200).json({
    success: true,
    message: "Product added to cart",
    data: { cart: user.cart },
  });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) throw new ApiError(400, "Product ID is required");
  if (quantity === undefined || !Number.isFinite(Number(quantity)) || Number(quantity) < 0) {
    throw new ApiError(400, "Valid quantity is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const requestedQuantity = Number(quantity);
  if (requestedQuantity === 0) {
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );
  } else {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, "Product not found or unavailable");
    }
    if (product.stock < 1) throw new ApiError(409, "Product is out of stock");

    const item = user.cart.find(
      (entry) => entry.product.toString() === productId
    );
    if (item) item.quantity = Math.min(product.stock, requestedQuantity);
  }

  await user.save();
  await user.populate("cart.product");

  return res.status(200).json({
    success: true,
    message: "Cart updated",
    data: { cart: user.cart },
  });
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  user.cart = user.cart.filter(
    (item) => item.product.toString() !== req.params.productId
  );
  await user.save();
  await user.populate("cart.product");

  return res.status(200).json({
    success: true,
    message: "Item removed from cart",
    data: { cart: user.cart },
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  user.cart = [];
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Cart cleared",
    data: { cart: [] },
  });
});

export const syncCart = asyncHandler(async (req, res) => {
  const { items = [] } = req.body;
  if (!Array.isArray(items)) throw new ApiError(400, "Items must be an array");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  for (const item of items) {
    if (!item.productId) continue;
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive || product.stock <= 0) continue;

    const existingItem = user.cart.find(
      (entry) => entry.product.toString() === item.productId
    );
    const quantity = Math.max(1, Number(item.quantity) || 1);

    if (existingItem) {
      existingItem.quantity = Math.min(
        product.stock,
        Math.max(existingItem.quantity, quantity)
      );
    } else {
      user.cart.push({
        product: product._id,
        quantity: Math.min(product.stock, quantity),
      });
    }
  }

  await user.save();
  await user.populate("cart.product");

  return res.status(200).json({
    success: true,
    message: "Cart synced successfully",
    data: { cart: user.cart },
  });
});
