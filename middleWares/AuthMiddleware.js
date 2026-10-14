import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token) {
    token = req.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authenticated" });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error("JWT_SECRET is not configured"));
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    return next(error);
  }

  if (
    !decodedToken ||
    typeof decodedToken !== "object" ||
    typeof decodedToken.id !== "string" ||
    !/^[a-f\d]{24}$/i.test(decodedToken.id)
  ) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  const user = await User.findById(decodedToken.id);
  if (!user) {
    return res.status(401).json({ success: false, message: "Not Authenticated" });
  }

  req.user = user;
  return next();
};
