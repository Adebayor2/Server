import Product from "../models/Products.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadImages, deleteImages } from "./cloudinaryService.js";

const escapeRegex = (string = "") =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createProduct = async (data, files) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, "At least one product image is required");
  }

  const product = new Product(data);

  // Validate fields in memory before executing Cloudinary uploads
  await product.validate();

  const uploadedImages = await uploadImages(files);
  product.images = uploadedImages;

  try {
    await product.save();
  } catch (error) {
    await deleteImages(uploadedImages.map((img) => img.publicId));
    throw error;
  }

  return product;
};

export const getAllProducts = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 12,
    sort = "-createdAt",
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    featured,
    inStock,
    isActive,
  } = queryParams;

  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  }

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
  }

  if (brand) {
    filter.brand = new RegExp(`^${escapeRegex(brand.trim())}$`, "i");
  }

  if (featured !== undefined) {
    filter.featured = featured === "true" || featured === true;
  }

  if (inStock === "true" || inStock === true) {
    filter.stock = { $gt: 0 };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined && !isNaN(minPrice)) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  if (search && search.trim()) {
    const escapedSearch = escapeRegex(search.trim());
    filter.$or = [
      { title: { $regex: escapedSearch, $options: "i" } },
      { brand: { $regex: escapedSearch, $options: "i" } },
      { category: { $regex: escapedSearch, $options: "i" } },
      { description: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const numericPage = Math.max(1, Number(page) || 1);
  const numericLimit = Math.max(1, Math.min(100, Number(limit) || 12));
  const skip = (numericPage - 1) * numericLimit;

  let sortCriteria = sort;
  if (sort === "price_asc") sortCriteria = "price";
  else if (sort === "price_desc") sortCriteria = "-price";
  else if (sort === "newest") sortCriteria = "-createdAt";
  else if (sort === "rating") sortCriteria = "-rating";

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortCriteria).skip(skip).limit(numericLimit),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
};

export const getProductById = async (identifier) => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
  const query = isObjectId ? { _id: identifier } : { slug: identifier };

  const product = await Product.findOne(query);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return product;
};

export const updateProduct = async (id, data, files) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  let newImages = [];
  if (files && files.length > 0) {
    if (product.images.length + files.length > 8) {
      throw new ApiError(400, "A product can have a maximum of 8 images");
    }
    newImages = await uploadImages(files);
    product.images = [...product.images, ...newImages];
  }

  Object.assign(product, data);

  try {
    await product.save();
  } catch (error) {
    if (newImages.length > 0) {
      await deleteImages(newImages.map((img) => img.publicId));
    }
    throw error;
  }

  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.images && product.images.length > 0) {
    await deleteImages(product.images.map((img) => img.publicId));
  }

  await Product.findByIdAndDelete(id);
  return { id };
};