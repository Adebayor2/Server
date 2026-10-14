import mongoose from "mongoose";

export const ORDER_STATUSES = Object.freeze([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    sku: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, default: "Nigeria", trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      index: true,
    },
    fulfillmentMethod: {
      type: String,
      enum: ["delivery", "pickup"],
      required: true,
    },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    pickupLocation: { type: String, trim: true, default: "" },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "bank_transfer", "card", "flutterwave"],
      default: "flutterwave",
    },
    paymentReference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    paymentTransactionId: { type: String, trim: true, default: "" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Order", orderSchema);
