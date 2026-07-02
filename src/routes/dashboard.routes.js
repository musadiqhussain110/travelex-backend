import express from "express";

import {
  getDashboardOverview,
  getBusinessInsights,
} from "../controllers/dashboard.controller.js";

import {
  protect,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { validate } from "../middleware/validate.middleware.js";

import {
  dashboardOverviewQuerySchema,
  businessInsightsQuerySchema,
} from "../validations/dashboard.validation.js";

const router = express.Router();

// All dashboard routes are admin protected
router.use(protect);
router.use(requirePermission("dashboard", "view"));

router.get(
  "/overview",
  validate(dashboardOverviewQuerySchema),
  getDashboardOverview
);

router.get(
  "/business-insights",
  validate(businessInsightsQuerySchema),
  getBusinessInsights
);

export default router;