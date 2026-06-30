import express from "express";

import {
  createContactInquiry,
  getContactInquiries,
  getContactInquiryById,
  updateContactInquiryStatus,
  addContactInquiryNote,
  assignContactInquiry,
  archiveContactInquiry,
  getContactInquiryStats,
} from "../controllers/contactInquiry.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createContactInquirySchema,
  getContactInquiriesQuerySchema,
  contactInquiryIdParamSchema,
  updateContactInquiryStatusSchema,
  addContactInquiryNoteSchema,
  assignContactInquirySchema,
} from "../validations/contactInquiry.validation.js";

const router = express.Router();

// Public route: website visitors can submit contact inquiry
router.post("/", validate(createContactInquirySchema), createContactInquiry);

// Admin protected routes
router.use(protect);

router.get(
  "/",
  validate(getContactInquiriesQuerySchema),
  getContactInquiries
);

// IMPORTANT: keep stats route before /:id
router.get("/stats/summary", getContactInquiryStats);

router.get(
  "/:id",
  validate(contactInquiryIdParamSchema),
  getContactInquiryById
);

router.patch(
  "/:id/status",
  validate(updateContactInquiryStatusSchema),
  updateContactInquiryStatus
);

router.post(
  "/:id/notes",
  validate(addContactInquiryNoteSchema),
  addContactInquiryNote
);

router.patch(
  "/:id/assign",
  authorize("superAdmin", "admin"),
  validate(assignContactInquirySchema),
  assignContactInquiry
);

router.patch(
  "/:id/archive",
  authorize("superAdmin", "admin"),
  validate(contactInquiryIdParamSchema),
  archiveContactInquiry
);

export default router;