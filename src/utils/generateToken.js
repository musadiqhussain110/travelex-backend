import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      role: admin.role
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
};