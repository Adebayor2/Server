import jwt from "jsonwebtoken";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

export const AccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, { ...getCookieOptions(), maxAge: COOKIE_MAX_AGE });
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", getCookieOptions());
};