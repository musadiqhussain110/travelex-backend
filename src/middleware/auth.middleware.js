import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. Token missing.");
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);

  const admin = await Admin.findById(decoded.id).select("-password");

  if (!admin) {
    res.status(401);
    throw new Error("Not authorized. Admin not found.");
  }

  if (!admin.isActive) {
    res.status(403);
    throw new Error("This admin account is disabled.");
  }

  req.admin = admin;

  next();
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      res.status(403);
      throw new Error("You do not have permission to perform this action.");
    }

    next();
  };
};