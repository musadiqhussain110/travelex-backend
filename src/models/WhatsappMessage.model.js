import mongoose from "mongoose"

const whatsappMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsappConversation",
      default: null,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    profileName: {
      type: String,
      trim: true,
      default: "",
    },

    providerMessageId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "button", "interactive", "unknown"],
      default: "text",
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    intent: {
      type: String,
      trim: true,
      default: "general",
      index: true,
    },

    autoReplied: {
      type: Boolean,
      default: false,
    },

    handoffRequired: {
      type: Boolean,
      default: false,
    },

    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

const WhatsappMessage = mongoose.model(
  "WhatsappMessage",
  whatsappMessageSchema
)

export default WhatsappMessage