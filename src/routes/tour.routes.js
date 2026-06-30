import express from "express";

import {
  createTour,
  getPublicTours,
  getAdminTours,
  getPublicTourBySlug,
  getAdminTourById,
  updateTour,
  archiveTour
} from "../controllers/tour.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createTourSchema,
  updateTourSchema,
  getToursQuerySchema,
  tourIdParamSchema,
  tourSlugParamSchema
} from "../validations/tour.validation.js";

const router = express.Router();

// Public routes
router.get("/", validate(getToursQuerySchema), getPublicTours);

// Admin routes
router.get(
  "/admin/all",
  protect,
  validate(getToursQuerySchema),
  getAdminTours
);

router.get(
  "/admin/:id",
  protect,
  validate(tourIdParamSchema),
  getAdminTourById
);

router.post(
  "/",
  protect,
  authorize("superAdmin", "admin"),
  validate(createTourSchema),
  createTour
);

router.patch(
  "/:id",
  protect,
  authorize("superAdmin", "admin"),
  validate(updateTourSchema),
  updateTour
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(tourIdParamSchema),
  archiveTour
);

// Public slug route should stay at bottom
router.get(
  "/:slug",
  validate(tourSlugParamSchema),
  getPublicTourBySlug
);

export default router;