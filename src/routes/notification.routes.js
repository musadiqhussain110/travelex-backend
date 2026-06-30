import express from "express";

import {
  createManualNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
} from "../controllers/notification.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createManualNotificationSchema,
  getNotificationsQuerySchema,
  notificationIdParamSchema,
} from "../validations/notification.validation.js";

const router = express.Router();

// All notification routes are admin protected
router.use(protect);

router.get("/", validate(getNotificationsQuerySchema), getNotifications);

router.get("/unread-count", getUnreadNotificationCount);

router.post(
  "/",
  authorize("superAdmin", "admin"),
  validate(createManualNotificationSchema),
  createManualNotification
);

router.patch("/mark-all-read", markAllNotificationsAsRead);

router.patch(
  "/:id/read",
  validate(notificationIdParamSchema),
  markNotificationAsRead
);

router.patch(
  "/:id/archive",
  authorize("superAdmin", "admin"),
  validate(notificationIdParamSchema),
  archiveNotification
);

export default router;