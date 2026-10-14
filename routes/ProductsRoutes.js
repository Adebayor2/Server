import { Router } from "express";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireAdmin } from "../middleWares/RoleMiddleware.js";
import { upload } from "../middleWares/UploadMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controller/ProductController.js";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin-only routes
router.post("/", authMiddleware, requireAdmin, upload.array("images", 8), createProduct);
router.put("/:id", authMiddleware, requireAdmin, upload.array("images", 8), updateProduct);
router.delete("/:id", authMiddleware, requireAdmin, deleteProduct);

export default router;