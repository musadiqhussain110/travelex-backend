import express from "express"

import {
  getWhatsappLogs,
  getWhatsappLogById,
  getWhatsappStats,
  retryWhatsappLog,
  verifyWhatsappWebhook,
  receiveWhatsappWebhook,
} from "../controllers/whatsapp.controller.js"

import { protect, authorize } from "../middleware/auth.middleware.js"
import { validate } from "../middleware/validate.middleware.js"

import {
  getWhatsappLogsQuerySchema,
  whatsappLogIdParamSchema,
} from "../validations/whatsapp.validation.js"

const router = express.Router()

/**
 * Public Meta WhatsApp webhook routes.
 * These must stay before router.use(protect).
 */
router.get("/webhook", verifyWhatsappWebhook)
router.post("/webhook", receiveWhatsappWebhook)

/**
 * Protected admin WhatsApp logs routes.
 */
router.use(protect)

router.get("/logs", validate(getWhatsappLogsQuerySchema), getWhatsappLogs)

router.get("/logs/stats", getWhatsappStats)

router.get(
  "/logs/:id",
  validate(whatsappLogIdParamSchema),
  getWhatsappLogById
)

router.post(
  "/logs/:id/retry",
  authorize("superAdmin", "admin"),
  validate(whatsappLogIdParamSchema),
  retryWhatsappLog
)

export default router