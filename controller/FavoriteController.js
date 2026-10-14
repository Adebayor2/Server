import User from "../models/User.js";
import Product from "../models/Products.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("favorites");
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json({
    success: true,
    data: { products: user.favorites },
  });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const productId = product._id.toString();
  const alreadyFavorite = user.favorites.some(
    (favorite) => favorite.toString() === productId
  );
  user.favorites = alreadyFavorite
    ? user.favorites.filter((favorite) => favorite.toString() !== productId)
    : [...user.favorites, product._id];

  await user.save();

  return res.status(200).json({
    success: true,
    data: {
      productIds: user.favorites.map(String),
      isFavorite: !alreadyFavorite,
    },
  });
});
