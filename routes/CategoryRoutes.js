import { Router } from "express";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireAdmin } from "../middleWares/RoleMiddleware.js";
import { upload } from "../middleWares/UploadMiddleware.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controller/CategoryController.js";

const router = Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes
router.post("/", authMiddleware, requireAdmin, upload.single("image"), createCategory);
router.put("/:id", authMiddleware, requireAdmin, upload.single("image"), updateCategory);
router.delete("/:id", authMiddleware, requireAdmin, deleteCategory);

export default router;
