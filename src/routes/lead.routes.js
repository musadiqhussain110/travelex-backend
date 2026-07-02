import express from "express"

import {
  createLead,
  getLeads,
  exportLeadsCsv,
  getLeadById,
  updateLeadStatus,
  updateLeadFollowUp,
  addLeadNote,
  assignLead,
  archiveLead,
  getLeadStats,
  syncLeadPrioritiesNow,
} from "../controllers/lead.controller.js"

import { protect, authorize } from "../middleware/auth.middleware.js"
import { validate } from "../middleware/validate.middleware.js"

import {
  createLeadSchema,
  getLeadsQuerySchema,
  leadIdParamSchema,
  updateLeadStatusSchema,
  updateLeadFollowUpSchema,
  addLeadNoteSchema,
  assignLeadSchema,
} from "../validations/lead.validation.js"

const router = express.Router()

router.post("/", validate(createLeadSchema), createLead)

router.get("/", protect, validate(getLeadsQuerySchema), getLeads)

router.get("/stats", protect, getLeadStats)

router.get(
  "/export",
  protect,
  validate(getLeadsQuerySchema),
  exportLeadsCsv
)

router.patch(
  "/sync-priorities",
  protect,
  authorize("superAdmin", "admin"),
  syncLeadPrioritiesNow
)

router.get("/:id", protect, validate(leadIdParamSchema), getLeadById)

router.patch(
  "/:id/status",
  protect,
  validate(updateLeadStatusSchema),
  updateLeadStatus
)

router.patch(
  "/:id/follow-up",
  protect,
  validate(updateLeadFollowUpSchema),
  updateLeadFollowUp
)

router.post(
  "/:id/notes",
  protect,
  validate(addLeadNoteSchema),
  addLeadNote
)

router.patch(
  "/:id/assign",
  protect,
  authorize("superAdmin", "admin"),
  validate(assignLeadSchema),
  assignLead
)

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(leadIdParamSchema),
  archiveLead
)

export default router