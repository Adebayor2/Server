import mongoose from "mongoose";
import crypto from "crypto";
import { slugify } from "../utils/slugify.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
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
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre("validate", async function () {
  if (!this.name) return;
  if (!this.slug || this.isModified("name")) {
    const base = slugify(this.name);
    let slug = base;

    const existing = await this.constructor.findOne({
      slug,
      _id: { $ne: this._id },
    });

    if (existing) {
      slug = `${base}-${crypto.randomBytes(2).toString("hex")}`;
    }

    this.slug = slug;
  }
});

const category = mongoose.model("Category", categorySchema);
export default category;
