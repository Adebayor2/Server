import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authenticated" });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Not Authenticated" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
