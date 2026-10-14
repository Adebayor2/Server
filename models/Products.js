import mongoose from "mongoose";
import crypto from "crypto";
import { slugify } from "../utils/slugify.js";

const MAX_IMAGES = 8;

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, "Image URL is required"] },
    publicId: { type: String, required: [true, "Image publicId is required"] },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (val) {
          if (val === undefined || val === null || val === 0) return true;
          return val <= this.price;
        },
        message: "Discount price cannot be greater than regular price",
      },
    },
    stock: {
      type: Number,
      default: 0,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
    },
    sold: {
      type: Number,
      default: 0,
      min: [0, "Sold cannot be negative"],
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: (images) => images.length <= MAX_IMAGES,
        message: `A product can have at most ${MAX_IMAGES} images`,
      },
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    colors: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre("validate", async function () {
  const nameOrTitle = this.title || this.name;
  if (!this.isNew || this.slug || !nameOrTitle) return;

  const base = slugify(nameOrTitle);
  let slug = base;

  const exists = await this.constructor.exists({ slug });
  if (exists) {
    slug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
  }

  this.slug = slug;
});

// Indexes
productSchema.index({ title: "text", brand: "text" });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ createdAt: -1 });

productSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Product", productSchema);