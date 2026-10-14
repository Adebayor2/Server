import { Router } from "express";
import {
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
  getAllOrders,
  getMyOrders,
  getOrderById,
  trackGuestOrder,
  updateOrderStatus,
} from "../controller/OrderController.js";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireAdmin, requireCustomer } from "../middleWares/RoleMiddleware.js";

const router = Router();

router.post("/guest/pay", initializeFlutterwavePayment);
router.post("/guest/track", trackGuestOrder);
router.post("/payment/verify", verifyFlutterwavePayment);
router.post("/pay", authMiddleware, requireCustomer, initializeFlutterwavePayment);
router.get("/", authMiddleware, requireCustomer, getMyOrders);
router.get("/admin/all", authMiddleware, requireAdmin, getAllOrders);
router.patch("/admin/:orderId/status", authMiddleware, requireAdmin, updateOrderStatus);
router.get("/:orderId", authMiddleware, requireCustomer, getOrderById);

export default router;
