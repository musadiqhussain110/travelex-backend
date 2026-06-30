import express from "express";

import {
  createFaq,
  getPublicFaqs,
  getAdminFaqs,
  getPublicFaqBySlug,
  getAdminFaqById,
  updateFaq,
  archiveFaq
} from "../controllers/faq.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createFaqSchema,
  updateFaqSchema,
  getFaqsQuerySchema,
  faqIdParamSchema,
  faqSlugParamSchema
} from "../validations/faq.validation.js";

const router = express.Router();

// Public routes
router.get("/", validate(getFaqsQuerySchema), getPublicFaqs);

// Admin routes
router.get(
  "/admin/all",
  protect,
  validate(getFaqsQuerySchema),
  getAdminFaqs
);

router.get(
  "/admin/:id",
  protect,
  validate(faqIdParamSchema),
  getAdminFaqById
);

router.post(
  "/",
  protect,
  authorize("superAdmin", "admin"),
  validate(createFaqSchema),
  createFaq
);

router.patch(
  "/:id",
  protect,
  authorize("superAdmin", "admin"),
  validate(updateFaqSchema),
  updateFaq
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(faqIdParamSchema),
  archiveFaq
);

// Public slug route should stay at bottom
router.get(
  "/:slug",
  validate(faqSlugParamSchema),
  getPublicFaqBySlug
);

export default router;