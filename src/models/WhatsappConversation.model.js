import mongoose from "mongoose"

const whatsappConversationSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },

    profileName: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["open", "auto_reply", "human_handoff", "closed"],
      default: "open",
      index: true,
    },

    currentIntent: {
      type: String,
      trim: true,
      default: "general",
      index: true,
    },

    lastIncomingMessage: {
      type: String,
      trim: true,
      default: "",
    },

    lastOutgoingMessage: {
      type: String,
      trim: true,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    messageCount: {
      type: Number,
      default: 0,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

const WhatsappConversation = mongoose.model(
  "WhatsappConversation",
  whatsappConversationSchema
)

export default WhatsappConversation