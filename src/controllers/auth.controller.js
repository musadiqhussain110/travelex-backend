import Admin from "../models/Admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const normalizedEmail = email.toLowerCase().trim();

  const admin = await Admin.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!admin) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  if (!admin.isActive) {
    res.status(403);
    throw new Error("Your admin account has been disabled.");
  }

  const isPasswordCorrect = await admin.comparePassword(password);

  if (!isPasswordCorrect) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  admin.lastLogin = new Date();
  await admin.save();

  const token = generateToken(admin);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

export const getAdminProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      isActive: req.admin.isActive,
      lastLogin: req.admin.lastLogin,
      createdAt: req.admin.createdAt,
    },
  });
});