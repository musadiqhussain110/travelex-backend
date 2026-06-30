import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "lead",
  "contact-inquiry",
  "umrah-package",
  "tour",
  "visa-service",
  "blog",
  "faq",
  "media",
  "system"
];

export const NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high"
];

export const RELATED_MODELS = [
  "Lead",
  "ContactInquiry",
  "UmrahPackage",
  "Tour",
  "VisaService",
  "Blog",
  "Faq",
  "None"
];

const readBySchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },

    readAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [160, "Title cannot exceed 160 characters"]
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"]
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "system"
    },

    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "normal"
    },

    relatedModel: {
      type: String,
      enum: RELATED_MODELS,
      default: "None"
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    actionUrl: {
      type: String,
      trim: true,
      default: ""
    },

    readBy: [readBySchema],

    isArchived: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ isArchived: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({
  title: "text",
  message: "text"
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;