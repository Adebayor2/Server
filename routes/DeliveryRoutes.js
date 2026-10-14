import { Router } from "express";
import {
  getCheckoutOptions,
  updateDeliveryFee,
} from "../controller/DeliveryController.js";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireAdmin } from "../middleWares/RoleMiddleware.js";

const router = Router();

router.get("/", getCheckoutOptions);
router.put("/:state", authMiddleware, requireAdmin, updateDeliveryFee);

export default router;
