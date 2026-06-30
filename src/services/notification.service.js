import Notification from "../models/Notification.model.js";

export const createNotification = async ({
  title,
  message,
  type = "system",
  priority = "normal",
  relatedModel = "None",
  relatedId = null,
  actionUrl = "",
  createdBy = null
}) => {
  try {
    return await Notification.create({
      title,
      message,
      type,
      priority,
      relatedModel,
      relatedId,
      actionUrl,
      createdBy
    });
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};