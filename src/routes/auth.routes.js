import express from "express";

import {
  loginAdmin,
  getAdminProfile
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { adminLoginSchema } from "../validations/auth.validation.js";

const router = express.Router();

router.post("/login", validate(adminLoginSchema), loginAdmin);

router.get("/me", protect, getAdminProfile);

export default router;