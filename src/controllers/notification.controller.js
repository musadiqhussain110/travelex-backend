import Notification from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "../services/notification.service.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const addReadStatus = (notifications, adminId) => {
  return notifications.map((notification) => {
    const isRead = notification.readBy.some(
      (item) => item.admin.toString() === adminId.toString()
    );

    return {
      ...notification,
      isRead
    };
  });
};

export const createManualNotification = asyncHandler(async (req, res) => {
  const notificationData = req.validated.body;

  const notification = await createNotification({
    ...notificationData,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Notification created successfully.",
    notification
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    type,
    priority,
    readStatus,
    sort
  } = req.validated.query;

  const filter = {
    isArchived: false
  };

  if (type) {
    filter.type = type;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (readStatus === "unread") {
    filter["readBy.admin"] = { $ne: req.admin._id };
  }

  if (readStatus === "read") {
    filter["readBy.admin"] = req.admin._id;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { message: { $regex: safeSearch, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .populate("createdBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    unreadCount: await Notification.countDocuments({
      isArchived: false,
      "readBy.admin": { $ne: req.admin._id }
    }),
    notifications: addReadStatus(notifications, req.admin._id)
  });
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    isArchived: false,
    "readBy.admin": { $ne: req.admin._id }
  });

  res.status(200).json({
    success: true,
    unreadCount
  });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const notification = await Notification.findById(id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found.");
  }

  const alreadyRead = notification.readBy.some(
    (item) => item.admin.toString() === req.admin._id.toString()
  );

  if (!alreadyRead) {
    notification.readBy.push({
      admin: req.admin._id,
      readAt: new Date()
    });

    await notification.save();
  }

  res.status(200).json({
    success: true,
    message: "Notification marked as read.",
    notification
  });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const unreadNotifications = await Notification.find({
    isArchived: false,
    "readBy.admin": { $ne: req.admin._id }
  });

  await Promise.all(
    unreadNotifications.map((notification) => {
      notification.readBy.push({
        admin: req.admin._id,
        readAt: new Date()
      });

      return notification.save();
    })
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
    updatedCount: unreadNotifications.length
  });
});

export const archiveNotification = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    {
      isArchived: true
    },
    {
      new: true
    }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found.");
  }

  res.status(200).json({
    success: true,
    message: "Notification archived successfully.",
    notification
  });
});