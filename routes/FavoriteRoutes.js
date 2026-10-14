import { Router } from "express";
import {
  getFavorites,
  toggleFavorite,
} from "../controller/FavoriteController.js";
import { authMiddleware } from "../middleWares/AuthMiddleware.js";
import { requireCustomer } from "../middleWares/RoleMiddleware.js";

const router = Router();

router.use(authMiddleware, requireCustomer);
router.get("/", getFavorites);
router.put("/:productId", toggleFavorite);

export default router;
