import mongoose from "mongoose"

const whatsappLogSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    contactInquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactInquiry",
      default: null,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      default: "outbound",
    },

    purpose: {
      type: String,
      enum: [
        "admin_lead_alert",
        "customer_confirmation",
        "follow_up",
        "status_update",
        "manual",
      ],
      default: "manual",
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    provider: {
      type: String,
      enum: ["meta_whatsapp_cloud", "manual", "disabled"],
      default: "meta_whatsapp_cloud",
    },

    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
    },

    providerMessageId: {
      type: String,
      default: "",
    },

    errorMessage: {
      type: String,
      default: "",
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

whatsappLogSchema.index({ lead: 1 })
whatsappLogSchema.index({ contactInquiry: 1 })
whatsappLogSchema.index({ phone: 1 })
whatsappLogSchema.index({ status: 1 })
whatsappLogSchema.index({ purpose: 1 })
whatsappLogSchema.index({ createdAt: -1 })

const WhatsappLog = mongoose.model("WhatsappLog", whatsappLogSchema)

export default WhatsappLog