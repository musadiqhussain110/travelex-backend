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
  runDailyFollowUpRemindersNow,
} from "../controllers/followUpReminder.controller.js"

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

/*
|--------------------------------------------------------------------------
| Public lead creation
|--------------------------------------------------------------------------
| Website forms can create leads without admin authentication.
*/
router.post(
  "/",
  validate(createLeadSchema),
  createLead
)

/*
|--------------------------------------------------------------------------
| View leads
|--------------------------------------------------------------------------
*/
router.get(
  "/",
  protect,
  requireLeadAccess("view"),
  validate(getLeadsQuerySchema),
  getLeads
)

/*
|--------------------------------------------------------------------------
| View lead stats
|--------------------------------------------------------------------------
*/
router.get(
  "/stats",
  protect,
  requireLeadAccess("view"),
  getLeadStats
)

/*
|--------------------------------------------------------------------------
| Export leads CSV
|--------------------------------------------------------------------------
*/
router.get(
  "/export",
  protect,
  requireLeadAccess("export"),
  validate(getLeadsQuerySchema),
  exportLeadsCsv
)

/*
|--------------------------------------------------------------------------
| Sync lead priorities
|--------------------------------------------------------------------------
*/
router.patch(
  "/sync-priorities",
  protect,
  requireLeadAccess("update"),
  syncLeadPrioritiesNow
)

/*
|--------------------------------------------------------------------------
| Run daily follow-up reminder engine
|--------------------------------------------------------------------------
| POST /api/v1/leads/reminders/run-daily
|
| Why require "assign" permission?
|
| Super Admin: allowed
| Admin:       allowed
| Consultant:  blocked
| Viewer:      blocked
|
| This prevents ordinary consultants from globally triggering reminders
| for every assigned consultant.
|--------------------------------------------------------------------------
*/
router.post(
  "/reminders/run-daily",
  protect,
  requireLeadAccess("assign"),
  runDailyFollowUpRemindersNow
)

/*
|--------------------------------------------------------------------------
| View single lead
|--------------------------------------------------------------------------
| Dynamic :id routes stay below fixed routes such as:
| /stats
| /export
| /reminders/run-daily
|--------------------------------------------------------------------------
*/
router.get(
  "/:id",
  protect,
  requireLeadAccess("view"),
  validate(leadIdParamSchema),
  getLeadById
)

/*
|--------------------------------------------------------------------------
| Update lead status
|--------------------------------------------------------------------------
*/
router.patch(
  "/:id/status",
  protect,
  requireLeadAccess("update"),
  validate(updateLeadStatusSchema),
  updateLeadStatus
)

/*
|--------------------------------------------------------------------------
| Update lead follow-up
|--------------------------------------------------------------------------
*/
router.patch(
  "/:id/follow-up",
  protect,
  requireLeadAccess("update"),
  validate(updateLeadFollowUpSchema),
  updateLeadFollowUp
)

/*
|--------------------------------------------------------------------------
| Add lead note
|--------------------------------------------------------------------------
*/
router.post(
  "/:id/notes",
  protect,
  requireLeadAccess("update"),
  validate(addLeadNoteSchema),
  addLeadNote
)

/*
|--------------------------------------------------------------------------
| Assign / reassign lead
|--------------------------------------------------------------------------
*/
router.patch(
  "/:id/assign",
  protect,
  requireLeadAccess("assign"),
  validate(assignLeadSchema),
  assignLead
)

/*
|--------------------------------------------------------------------------
| Archive lead
|--------------------------------------------------------------------------
*/
router.patch(
  "/:id/archive",
  protect,
  requireLeadAccess("archive"),
  validate(leadIdParamSchema),
  archiveLead
)

export default router