import express from "express";

import { getDashboardOverview } from "../controllers/dashboard.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import { dashboardOverviewQuerySchema } from "../validations/dashboard.validation.js";

const router = express.Router();

// All dashboard routes are admin protected
router.use(protect);

router.get(
  "/overview",
  validate(dashboardOverviewQuerySchema),
  getDashboardOverview
);

export default router;