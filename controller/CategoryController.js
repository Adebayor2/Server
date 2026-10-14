import Category from "../models/Category.js";
import Product from "../models/Products.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { uploadImageBuffer } from "../services/cloudinaryService.js";

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = "" } = req.body;
  if (typeof name !== "string" || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }
  if (typeof description !== "string") {
    throw new ApiError(400, "Description must be text");
  }

  const trimmedName = name.trim();
  const existingName = await Category.findOne({
    name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
  });
  if (existingName) {
    throw new ApiError(409, `Category "${trimmedName}" already exists`);
  }

  const baseSlug = slugify(trimmedName);
  let slug = baseSlug;
  const existingSlug = await Category.findOne({ slug });
  if (existingSlug) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  const uploadedImage = req.file
    ? await uploadImageBuffer(req.file.buffer, "ecommerce/categories")
    : null;
  const category = await Category.create({
    name: trimmedName,
    slug,
    description: description.trim(),
    image: uploadedImage?.url || (typeof req.body.image === "string" ? req.body.image.trim() : ""),
  });

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: { category },
  });
});

export const getAllCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({}).sort({ name: 1 });
  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: { categories, count: categories.length },
  });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const identifier = req.params.id;
  const query = /^[0-9a-fA-F]{24}$/.test(identifier)
    ? { _id: identifier }
    : { slug: identifier };
  const category = await Category.findOne(query);
  if (!category) throw new ApiError(404, "Category not found");
  res.status(200).json({
    success: true,
    message: "Category retrieved successfully",
    data: { category },
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  const { name, description } = req.body;
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "Category name cannot be empty");
    }
    const trimmed = name.trim();
    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, "i") },
      _id: { $ne: category._id },
    });
    if (duplicate) {
      throw new ApiError(409, `Category "${trimmed}" already exists`);
    }
    category.name = trimmed;
    category.slug = slugify(trimmed);
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new ApiError(400, "Description must be text");
    }
    category.description = description.trim();
  }

  if (req.body.image !== undefined) {
    category.image = typeof req.body.image === "string" ? req.body.image.trim() : "";
  }
  if (req.file) {
    const uploadedImage = await uploadImageBuffer(req.file.buffer, "ecommerce/categories");
    category.image = uploadedImage.url;
  }

  await category.save();
  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: { category },
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  if (await Product.exists({ category: category.name })) {
    throw new ApiError(409, "Move or reassign this category's products before deleting it");
  }

  await category.deleteOne();
  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});
