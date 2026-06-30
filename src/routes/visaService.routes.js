import express from "express";

import {
  createVisaService,
  getPublicVisaServices,
  getAdminVisaServices,
  getPublicVisaServiceBySlug,
  getAdminVisaServiceById,
  updateVisaService,
  archiveVisaService
} from "../controllers/visaService.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createVisaServiceSchema,
  updateVisaServiceSchema,
  getVisaServicesQuerySchema,
  visaServiceIdParamSchema,
  visaServiceSlugParamSchema
} from "../validations/visaService.validation.js";

const router = express.Router();

// Public routes
router.get("/", validate(getVisaServicesQuerySchema), getPublicVisaServices);

// Admin routes
router.get(
  "/admin/all",
  protect,
  validate(getVisaServicesQuerySchema),
  getAdminVisaServices
);

router.get(
  "/admin/:id",
  protect,
  validate(visaServiceIdParamSchema),
  getAdminVisaServiceById
);

router.post(
  "/",
  protect,
  authorize("superAdmin", "admin"),
  validate(createVisaServiceSchema),
  createVisaService
);

router.patch(
  "/:id",
  protect,
  authorize("superAdmin", "admin"),
  validate(updateVisaServiceSchema),
  updateVisaService
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(visaServiceIdParamSchema),
  archiveVisaService
);

// Public slug route should stay at bottom
router.get(
  "/:slug",
  validate(visaServiceSlugParamSchema),
  getPublicVisaServiceBySlug
);

export default router;