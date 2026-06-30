import express from "express";

import {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  addLeadNote,
  assignLead,
  archiveLead,
  getLeadStats,
} from "../controllers/lead.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createLeadSchema,
  getLeadsQuerySchema,
  leadIdParamSchema,
  updateLeadStatusSchema,
  addLeadNoteSchema,
  assignLeadSchema,
} from "../validations/lead.validation.js";

const router = express.Router();

// Public route: website visitors can submit lead forms
router.post("/", validate(createLeadSchema), createLead);

// Protected admin CRM routes
router.get("/", protect, validate(getLeadsQuerySchema), getLeads);

// IMPORTANT: keep /stats before /:id
router.get("/stats", protect, getLeadStats);

router.get("/:id", protect, validate(leadIdParamSchema), getLeadById);

router.patch(
  "/:id/status",
  protect,
  validate(updateLeadStatusSchema),
  updateLeadStatus
);

router.post(
  "/:id/notes",
  protect,
  validate(addLeadNoteSchema),
  addLeadNote
);

router.patch(
  "/:id/assign",
  protect,
  authorize("superAdmin", "admin"),
  validate(assignLeadSchema),
  assignLead
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(leadIdParamSchema),
  archiveLead
);

export default router;