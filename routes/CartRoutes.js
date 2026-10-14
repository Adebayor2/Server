import { Router } from "express";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  syncCart,
  updateCartItem,
} from "../controller/CartController.js";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireCustomer } from "../middleWares/RoleMiddleware.js";

const router = Router();

router.use(authMiddleware, requireCustomer);
router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartItem);
router.post("/sync", syncCart);
router.delete("/:productId", removeFromCart);
router.delete("/", clearCart);

export default router;
