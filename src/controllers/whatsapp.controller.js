import WhatsappLog from "../models/WhatsappLog.model.js"
import WhatsappConversation from "../models/WhatsappConversation.model.js"
import WhatsappMessage from "../models/WhatsappMessage.model.js"

import { env } from "../config/env.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { sendWhatsAppTextMessage } from "../services/whatsapp.service.js"
import { buildWhatsappAutoReply } from "../services/whatsapp.bot.service.js"

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const normalizePhoneNumber = (phone = "") => {
  let cleaned = String(phone).replace(/[^\d]/g, "")

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2)
  }

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = `92${cleaned.slice(1)}`
  }

  return cleaned
}

const getIncomingMessageText = (message = {}) => {
  if (message.type === "text") {
    return message.text?.body || ""
  }

  if (message.type === "button") {
    return message.button?.text || message.button?.payload || ""
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ||
      message.interactive?.button_reply?.id ||
      message.interactive?.list_reply?.title ||
      message.interactive?.list_reply?.id ||
      ""
    )
  }

  return ""
}

const getContactName = (contacts = [], phone = "") => {
  const contact = contacts.find((item) => item.wa_id === phone)
  return contact?.profile?.name || ""
}

const notifyAdminForHandoff = async ({ phone, profileName, message, intent }) => {
  if (!env.TRAVELEX_ADMIN_WHATSAPP) return null

  const adminMessage = [
    "WhatsApp Human Handoff Required",
    "",
    `Customer: ${profileName || "Unknown"}`,
    `Phone: ${phone}`,
    `Intent: ${intent}`,
    "",
    `Message: ${message}`,
  ].join("\n")

  return sendWhatsAppTextMessage({
    to: env.TRAVELEX_ADMIN_WHATSAPP,
    message: adminMessage,
    purpose: "human_handoff_alert",
  })
}

export const verifyWhatsappWebhook = asyncHandler(async (req, res) => {
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge)
  }

  return res.status(403).json({
    success: false,
    message: "WhatsApp webhook verification failed.",
  })
})

export const receiveWhatsappWebhook = asyncHandler(async (req, res) => {
  const body = req.body

  const entries = body?.entry || []

  for (const entry of entries) {
    const changes = entry?.changes || []

    for (const change of changes) {
      const value = change?.value || {}
      const messages = value?.messages || []
      const contacts = value?.contacts || []

      if (!messages.length) {
        continue
      }

      for (const incoming of messages) {
        const phone = normalizePhoneNumber(incoming.from || "")
        const providerMessageId = incoming.id || ""
        const messageText = getIncomingMessageText(incoming)
        const profileName = getContactName(contacts, incoming.from)

        if (!phone || !providerMessageId) {
          continue
        }

        const alreadySaved = await WhatsappMessage.findOne({
          providerMessageId,
        }).lean()

        if (alreadySaved) {
          continue
        }

        const conversation = await WhatsappConversation.findOneAndUpdate(
          { phone },
          {
            $set: {
              profileName,
              lastIncomingMessage: messageText,
              lastMessageAt: new Date(),
            },
            $inc: {
              messageCount: 1,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        )

        const botResponse = buildWhatsappAutoReply({
          message: messageText,
          profileName,
        })

        await WhatsappMessage.create({
          conversation: conversation._id,
          phone,
          profileName,
          providerMessageId,
          direction: "incoming",
          type: incoming.type || "unknown",
          message: messageText,
          intent: botResponse.intent,
          autoReplied: false,
          handoffRequired: botResponse.handoffRequired,
          rawPayload: incoming,
        })

        await WhatsappConversation.findByIdAndUpdate(conversation._id, {
          currentIntent: botResponse.intent,
          status: botResponse.handoffRequired ? "human_handoff" : "auto_reply",
          lastMessageAt: new Date(),
        })

        if (!env.WHATSAPP_AUTO_REPLY_ENABLED) {
          continue
        }

        const sendResult = await sendWhatsAppTextMessage({
          to: phone,
          message: botResponse.reply,
          purpose: "auto_reply",
        })

        await WhatsappMessage.create({
          conversation: conversation._id,
          phone,
          profileName,
          providerMessageId:
            sendResult?.response?.messages?.[0]?.id ||
            sendResult?.log?.providerMessageId ||
            "",
          direction: "outgoing",
          type: "text",
          message: botResponse.reply,
          intent: botResponse.intent,
          autoReplied: true,
          handoffRequired: botResponse.handoffRequired,
          rawPayload: sendResult?.response || {},
        })

        await WhatsappConversation.findByIdAndUpdate(conversation._id, {
          lastOutgoingMessage: botResponse.reply,
          lastMessageAt: new Date(),
        })

        if (botResponse.handoffRequired) {
          await notifyAdminForHandoff({
            phone,
            profileName,
            message: messageText,
            intent: botResponse.intent,
          })
        }
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: "WhatsApp webhook received.",
  })
})

export const getWhatsappLogs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    purpose,
    direction,
    provider,
    lead,
    contactInquiry,
    sort,
  } = req.validated.query

  const filter = {}

  if (status) filter.status = status
  if (purpose) filter.purpose = purpose
  if (direction) filter.direction = direction
  if (provider) filter.provider = provider
  if (lead) filter.lead = lead
  if (contactInquiry) filter.contactInquiry = contactInquiry

  if (search) {
    const safeSearch = escapeRegex(search)

    filter.$or = [
      { phone: { $regex: safeSearch, $options: "i" } },
      { message: { $regex: safeSearch, $options: "i" } },
      { errorMessage: { $regex: safeSearch, $options: "i" } },
      { providerMessageId: { $regex: safeSearch, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    WhatsappLog.find(filter)
      .populate("lead", "name email phone serviceType status createdAt")
      .populate("contactInquiry", "name email phone subject status createdAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    WhatsappLog.countDocuments(filter),
  ])

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    logs,
  })
})

export const getWhatsappLogById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const log = await WhatsappLog.findById(id)
    .populate("lead", "name email phone serviceType status message createdAt")
    .populate(
      "contactInquiry",
      "name email phone subject message status createdAt"
    )

  if (!log) {
    res.status(404)
    throw new Error("WhatsApp log not found.")
  }

  res.status(200).json({
    success: true,
    log,
  })
})

export const getWhatsappStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalLogs, todayLogs, statusStats, purposeStats, providerStats] =
    await Promise.all([
      WhatsappLog.countDocuments(),

      WhatsappLog.countDocuments({
        createdAt: { $gte: today },
      }),

      WhatsappLog.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      WhatsappLog.aggregate([
        { $group: { _id: "$purpose", count: { $sum: 1 } } },
      ]),

      WhatsappLog.aggregate([
        { $group: { _id: "$provider", count: { $sum: 1 } } },
      ]),
    ])

  const formatStats = (items) => {
    return items.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {})
  }

  res.status(200).json({
    success: true,
    stats: {
      totalLogs,
      todayLogs,
      byStatus: formatStats(statusStats),
      byPurpose: formatStats(purposeStats),
      byProvider: formatStats(providerStats),
    },
  })
})

export const retryWhatsappLog = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const oldLog = await WhatsappLog.findById(id)

  if (!oldLog) {
    res.status(404)
    throw new Error("WhatsApp log not found.")
  }

  if (!["failed", "skipped"].includes(oldLog.status)) {
    res.status(400)
    throw new Error("Only failed or skipped WhatsApp messages can be retried.")
  }

  const result = await sendWhatsAppTextMessage({
    to: oldLog.phone,
    message: oldLog.message,
    lead: oldLog.lead,
    contactInquiry: oldLog.contactInquiry,
    purpose: oldLog.purpose,
  })

  res.status(200).json({
    success: true,
    message: "WhatsApp retry processed.",
    retry: {
      success: result.success,
      skipped: result.skipped || false,
      log: result.log,
    },
  })
})