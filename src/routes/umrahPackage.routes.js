import express from "express";

import {
  createUmrahPackage,
  getPublicUmrahPackages,
  getAdminUmrahPackages,
  getPublicUmrahPackageBySlug,
  getAdminUmrahPackageById,
  updateUmrahPackage,
  archiveUmrahPackage
} from "../controllers/umrahPackage.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createUmrahPackageSchema,
  updateUmrahPackageSchema,
  getUmrahPackagesQuerySchema,
  umrahPackageIdParamSchema,
  umrahPackageSlugParamSchema
} from "../validations/umrahPackage.validation.js";

const router = express.Router();

// Public routes
router.get("/", validate(getUmrahPackagesQuerySchema), getPublicUmrahPackages);

// Admin routes
router.get(
  "/admin/all",
  protect,
  validate(getUmrahPackagesQuerySchema),
  getAdminUmrahPackages
);

router.get(
  "/admin/:id",
  protect,
  validate(umrahPackageIdParamSchema),
  getAdminUmrahPackageById
);

router.post(
  "/",
  protect,
  authorize("superAdmin", "admin"),
  validate(createUmrahPackageSchema),
  createUmrahPackage
);

router.patch(
  "/:id",
  protect,
  authorize("superAdmin", "admin"),
  validate(updateUmrahPackageSchema),
  updateUmrahPackage
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(umrahPackageIdParamSchema),
  archiveUmrahPackage
);

// Public slug route should stay at the bottom
router.get(
  "/:slug",
  validate(umrahPackageSlugParamSchema),
  getPublicUmrahPackageBySlug
);

export default router;