import crypto from "crypto";
import * as bcrypt from "bcrypt";
import User, { USER_ROLES } from "../models/User.js";
import { AccessToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const escapeRegex = (string = "") =>
  string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const Register = asyncHandler(async (req, res) => {
  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  const { firstName, lastName, email, password } = req.body;
  if (
    !isNonEmptyString(firstName) ||
    !isNonEmptyString(lastName) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    throw new ApiError(400, "All fields are required");
  }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new ApiError(400, "Please provide a valid email address");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const trimmedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: trimmedEmail });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: trimmedEmail,
    password: hashedPassword,
  });

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
  });
});

export const createAdminAccount = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};
  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  if (
    !isNonEmptyString(firstName) ||
    !isNonEmptyString(lastName) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new ApiError(400, "Please provide a valid email address");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    role: USER_ROLES.ADMIN,
  });

  return res.status(201).json({
    success: true,
    message: "Admin account created successfully",

  });
});

export const Login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const trimmedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: trimmedEmail }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = AccessToken(user._id);
  setAuthCookie(res, token);

  return res.status(200).json({
    success: true,
    message: "Login Successful",
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
      },
    },
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Current user retrieved",
    data: { user: req.user },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, address } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (firstName !== undefined) {
    if (typeof firstName !== "string" || !firstName.trim()) {
      throw new ApiError(400, "First name cannot be empty");
    }
    user.firstName = firstName.trim();
  }

  if (lastName !== undefined) {
    if (typeof lastName !== "string" || !lastName.trim()) {
      throw new ApiError(400, "Last name cannot be empty");
    }
    user.lastName = lastName.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== "string") {
      throw new ApiError(400, "Phone must be text");
    }
    user.phone = phone.trim();
  }

  if (address !== undefined) {
    if (typeof address !== "string") {
      throw new ApiError(400, "Address must be text");
    }
    user.address = address.trim();
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "User profile updated successfully",
    data: { user },
  });
});

export const Logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: "Logout Successful",
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Incorrect current password");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const changeEmail = asyncHandler(async (req, res) => {
  const { email, currentPassword } = req.body || {};
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new ApiError(400, "Please provide a valid email address");
  }
  if (typeof currentPassword !== "string" || !currentPassword) {
    throw new ApiError(400, "Current password is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) throw new ApiError(400, "Incorrect current password");
  if (normalizedEmail === user.email) {
    throw new ApiError(400, "New email must be different from your current email");
  }
  if (await User.exists({ email: normalizedEmail })) {
    throw new ApiError(409, "An account with this email already exists");
  }

  user.email = normalizedEmail;
  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      throw new ApiError(409, "An account with this email already exists");
    }
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: "Email address updated successfully",
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
      },
    },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Please provide an email address");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new ApiError(404, "User with email doesnt exist")
 
  }
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password reset email generated successfully",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = req.params.token || req.body.token;
  const { newPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }

  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "New password is required (minimum 8 characters)");
  }

  // Hash incoming token to compare with DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new ApiError(400, "Reset token is invalid or has expired");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password has been reset successfully. You can now login.",
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.userId)) {
    throw new ApiError(400, "Invalid user ID");
  }
  if (req.params.userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete your own admin account");
  }

  const user = await User.findByIdAndDelete(req.params.userId);
  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json({
    success: true,
    message: "User account deleted successfully",
    data: { userId: user._id },
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;

  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { firstName: { $regex: escaped, $options: "i" } },
      { lastName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const numericPage = Math.max(1, Number(page) || 1);
  const numericLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [users, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip(skip).limit(numericLimit),
    User.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: {
      users,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        totalPages: Math.ceil(total / numericLimit),
      },
    },
  });
});