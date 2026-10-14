import jwt from "jsonwebtoken";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

export const AccessToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const setAuthCookie = (res, token) => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === "string" || typeof payload.exp !== "number") {
    throw new Error("Cannot set an auth cookie for a token without an expiration");
  }

  res.cookie("token", token, {
    ...getCookieOptions(),
    maxAge: Math.max(0, payload.exp * 1000 - Date.now()),
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", getCookieOptions());
};