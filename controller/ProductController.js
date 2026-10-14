import { asyncHandler } from "../utils/asyncHandler.js";
import * as productService from "../services/ProductsService.js";

const parseProductBody = (body) => {
  const data = { ...body };

  // Remove potential stringified images in body so multer files are used
  delete data.images;

  if (typeof data.colors === "string" && data.colors.trim() !== "") {
    try {
      data.colors = JSON.parse(data.colors);
    } catch {
      data.colors = data.colors.split(",").map((c) => c.trim()).filter(Boolean);
    }
  }

  if (data.price !== undefined && data.price !== "") {
    data.price = Number(data.price);
  }
  if (data.discountPrice !== undefined && data.discountPrice !== "") {
    data.discountPrice = Number(data.discountPrice);
  }
  if (data.stock !== undefined && data.stock !== "") {
    data.stock = Number(data.stock);
  }
  if (data.sold !== undefined && data.sold !== "") {
    data.sold = Number(data.sold);
  }
  if (data.featured !== undefined) {
    data.featured = data.featured === "true" || data.featured === true;
  }
  if (data.isActive !== undefined) {
    data.isActive = data.isActive === "true" || data.isActive === true;
  }

  return data;
};

export const createProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req.body);
  const product = await productService.createProduct(data, req.files);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: { product },
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getAllProducts(req.query);

  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    data: result,
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product retrieved successfully",
    data: { product },
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req.body);
  const product = await productService.updateProduct(req.params.id, data, req.files);

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: { product },
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});