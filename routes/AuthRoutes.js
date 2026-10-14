import { Router } from "express";
import {
  Register,
  Login,
  Logout,
  getCurrentUser,
  updateUser,
  changePassword,
  changeEmail,
  forgotPassword,
  resetPassword,
  createAdminAccount,
  getAllUsers,
  deleteUser,
} from "../controller/AuthController.js";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireAdmin } from "../middleWares/RoleMiddleware.js";

const router = Router();

// Public auth routes
router.post("/register", Register);
router.post("/login", Login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/reset-password/:token", resetPassword);

// Authenticated user routes
router.post("/logout", Logout);
router.get("/user", authMiddleware, getCurrentUser);
router.put("/user", authMiddleware, updateUser);
router.patch("/user", authMiddleware, updateUser);
router.post("/change-password", authMiddleware, changePassword);
router.post("/change-email", authMiddleware, changeEmail);

// Admin-only user management routes
router.post("/admins", authMiddleware, requireAdmin, createAdminAccount);
router.get("/users", authMiddleware, requireAdmin, getAllUsers);
router.delete("/users/:userId", authMiddleware, requireAdmin, deleteUser);

export default router;
