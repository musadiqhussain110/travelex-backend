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

import {
  protect,
  requireLeadAccess,
} from "../middleware/auth.middleware.js"

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

// Public lead creation from website forms
router.post("/", validate(createLeadSchema), createLead)

// View leads
router.get(
  "/",
  protect,
  requireLeadAccess("view"),
  validate(getLeadsQuerySchema),
  getLeads
)

// View lead stats
router.get(
  "/stats",
  protect,
  requireLeadAccess("view"),
  getLeadStats
)

// Export leads CSV
router.get(
  "/export",
  protect,
  requireLeadAccess("export"),
  validate(getLeadsQuerySchema),
  exportLeadsCsv
)

// Sync priorities
router.patch(
  "/sync-priorities",
  protect,
  requireLeadAccess("update"),
  syncLeadPrioritiesNow
)

// View single lead
router.get(
  "/:id",
  protect,
  requireLeadAccess("view"),
  validate(leadIdParamSchema),
  getLeadById
)

// Update lead status
router.patch(
  "/:id/status",
  protect,
  requireLeadAccess("update"),
  validate(updateLeadStatusSchema),
  updateLeadStatus
)

// Update lead follow-up
router.patch(
  "/:id/follow-up",
  protect,
  requireLeadAccess("update"),
  validate(updateLeadFollowUpSchema),
  updateLeadFollowUp
)

// Add lead note
router.post(
  "/:id/notes",
  protect,
  requireLeadAccess("update"),
  validate(addLeadNoteSchema),
  addLeadNote
)

// Assign lead
router.patch(
  "/:id/assign",
  protect,
  requireLeadAccess("assign"),
  validate(assignLeadSchema),
  assignLead
)

// Archive lead
router.patch(
  "/:id/archive",
  protect,
  requireLeadAccess("archive"),
  validate(leadIdParamSchema),
  archiveLead
)

export default router