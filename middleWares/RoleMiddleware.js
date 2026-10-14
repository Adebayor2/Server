import { USER_ROLES } from "../models/User.js";

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }
    next();
  };
};

export const requireAdmin = authorizeRoles(USER_ROLES.ADMIN);
export const requireCustomer = authorizeRoles(USER_ROLES.CUSTOMER);
