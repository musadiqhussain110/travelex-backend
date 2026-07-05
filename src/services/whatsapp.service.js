import { env } from "../config/env.js"
import WhatsappLog from "../models/WhatsappLog.model.js"

/*
|--------------------------------------------------------------------------
| Phone normalization
|--------------------------------------------------------------------------
| Examples:
|
| 03001234567
| → 923001234567
|
| +923001234567
| → 923001234567
*/
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

const formatServiceType = (serviceType = "general") => {
  const labels = {
    umrah: "Umrah Package",
    tour: "International Tour",
    visa: "Visa Assistance",
    hotel: "Hotel Booking",
    carRental: "Car Rental / Transport",
    contact: "Contact Inquiry",
    general: "General Inquiry",
    ticket: "Domestic / International Ticket",
  }

  return labels[serviceType] || "General Inquiry"
}

const formatFollowUpTime = (time = "") => {
  if (!time) return "Time not set"

  const value = String(time).trim()

  const match = value.match(/^(\d{1,2}):(\d{2})$/)

  if (!match) return value

  const hours = Number(match[1])
  const minutes = match[2]

  if (
    Number.isNaN(hours) ||
    hours < 0 ||
    hours > 23
  ) {
    return value
  }

  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

const formatLeadMessageForAdmin = (lead) => {
  const travelers = lead.travelers || {}

  return [
    "New TravelEx Lead",
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Service: ${formatServiceType(lead.serviceType)}`,
    lead.destination
      ? `Destination: ${lead.destination}`
      : null,
    lead.budget
      ? `Budget: ${lead.budget}`
      : null,
    lead.travelDate
      ? `Travel Date: ${new Date(
          lead.travelDate
        ).toLocaleDateString("en-GB")}`
      : null,
    travelers.adults ||
    travelers.children ||
    travelers.infants
      ? `Travelers: ${
          travelers.adults || 1
        } adult(s), ${
          travelers.children || 0
        } child(ren), ${
          travelers.infants || 0
        } infant(s)`
      : null,
    lead.makkahNights
      ? `Makkah Nights: ${lead.makkahNights}`
      : null,
    lead.madinahNights
      ? `Madinah Nights: ${lead.madinahNights}`
      : null,
    lead.pickupLocation
      ? `Pickup: ${lead.pickupLocation}`
      : null,
    lead.dropoffLocation
      ? `Drop-off: ${lead.dropoffLocation}`
      : null,
    lead.message
      ? `Message: ${lead.message}`
      : null,
    "",
    `Admin Link: /admin/leads/${lead._id}`,
  ]
    .filter(Boolean)
    .join("\n")
}

const formatCustomerConfirmationMessage = (lead) => {
  return [
    `Assalamualaikum ${lead.name},`,
    "",
    `Thank you for contacting TravelEx.pk regarding ${formatServiceType(
      lead.serviceType
    )}.`,
    "",
    "Our team has received your inquiry and will contact you shortly with further guidance.",
    "",
    "Regards,",
    "TravelEx.pk Team",
  ].join("\n")
}

/*
|--------------------------------------------------------------------------
| Follow-up digest formatter
|--------------------------------------------------------------------------
| Produces:
|
| 1. 10:00 AM — Ali Raza — Visa Assistance
|    +923001234567
|    Ask for passport documents
|
| 2. 11:30 AM — Ahmed — Umrah Package
|    +923...
*/
const formatFollowUpDigestLines = (
  followUps = [],
  {
    maxItems = 10,
  } = {}
) => {
  const safeFollowUps = Array.isArray(followUps)
    ? followUps
    : []

  const visibleFollowUps = safeFollowUps.slice(
    0,
    maxItems
  )

  const lines = visibleFollowUps.map(
    (lead, index) => {
      const details = [
        `${index + 1}. ${formatFollowUpTime(
          lead.followUpTime
        )} — ${lead.name || "Customer"} — ${formatServiceType(
          lead.serviceType
        )}`,

        lead.phone
          ? `   Phone: ${lead.phone}`
          : null,

        lead.followUpNote
          ? `   Note: ${lead.followUpNote}`
          : null,
      ]

      return details
        .filter(Boolean)
        .join("\n")
    }
  )

  const remainingCount =
    safeFollowUps.length - visibleFollowUps.length

  if (remainingCount > 0) {
    lines.push(
      `...and ${remainingCount} more follow-up(s).`
    )
  }

  return lines.join("\n\n")
}

/*
|--------------------------------------------------------------------------
| Public formatter
|--------------------------------------------------------------------------
| Useful for email previews, logs, or test scripts.
*/
export const formatFollowUpDigestMessage = ({
  consultant,
  followUps = [],
  crmUrl = "",
}) => {
  const consultantName =
    consultant?.name || "Consultant"

  const digestLines = formatFollowUpDigestLines(
    followUps
  )

  return [
    "TravelEx Follow-up Reminder",
    "",
    `Assalamualaikum ${consultantName},`,
    "",
    `You have ${followUps.length} scheduled customer follow-up(s) today.`,
    "",
    digestLines || "No follow-ups found.",
    "",
    crmUrl
      ? `Open CRM: ${crmUrl}`
      : null,
    "",
    "Please update each follow-up after contacting the customer.",
    "",
    "TravelEx.pk CRM",
  ]
    .filter(Boolean)
    .join("\n")
}

/*
|--------------------------------------------------------------------------
| Existing plain text sender
|--------------------------------------------------------------------------
| Preserved for:
| - current customer conversations
| - existing admin alerts
| - existing customer confirmation logic
*/
export const sendWhatsAppTextMessage = async ({
  to,
  message,
  lead = null,
  contactInquiry = null,
  purpose = "manual",
}) => {
  const phone = normalizePhoneNumber(to)

  const log = await WhatsappLog.create({
    lead,
    contactInquiry,
    phone,
    purpose,
    message,
    provider: env.WHATSAPP_ENABLED
      ? "meta_whatsapp_cloud"
      : "disabled",
    status: env.WHATSAPP_ENABLED
      ? "pending"
      : "skipped",
  })

  if (!env.WHATSAPP_ENABLED) {
    log.errorMessage =
      "WhatsApp is disabled in environment settings."

    await log.save()

    return {
      success: false,
      skipped: true,
      log,
    }
  }

  if (
    !env.WHATSAPP_PHONE_NUMBER_ID ||
    !env.WHATSAPP_ACCESS_TOKEN ||
    !phone ||
    !message
  ) {
    log.status = "failed"

    log.errorMessage =
      "Missing WhatsApp credentials, recipient phone, or message body."

    await log.save()

    return {
      success: false,
      log,
    }
  }

  const endpoint =
    `https://graph.facebook.com/` +
    `${env.WHATSAPP_GRAPH_API_VERSION}/` +
    `${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",

        to: phone,

        type: "text",

        text: {
          preview_url: false,
          body: message,
        },
      }),
    })

    const data = await response.json()

    log.rawResponse = data

    if (!response.ok) {
      log.status = "failed"

      log.errorMessage =
        data?.error?.message ||
        "WhatsApp message failed to send."

      await log.save()

      return {
        success: false,
        log,
        response: data,
      }
    }

    log.status = "sent"

    log.providerMessageId =
      data?.messages?.[0]?.id || ""

    log.sentAt = new Date()

    await log.save()

    return {
      success: true,
      log,
      response: data,
    }
  } catch (error) {
    log.status = "failed"

    log.errorMessage =
      error.message ||
      "WhatsApp request failed."

    await log.save()

    return {
      success: false,
      log,
      error,
    }
  }
}

/*
|--------------------------------------------------------------------------
| Generic WhatsApp template sender
|--------------------------------------------------------------------------
| Needed for scheduled/proactive reminders.
|
| Example template:
|
| Name:
| travelex_daily_followup_reminder
|
| Body:
| Hello {{1}},
| You have {{2}} scheduled follow-ups today.
| {{3}}
| Open CRM: {{4}}
*/
export const sendWhatsAppTemplateMessage = async ({
  to,
  templateName,
  languageCode = "en_US",
  components = [],
  lead = null,
  contactInquiry = null,

  /*
  |--------------------------------------------------------------------------
  | Keep "manual" as default for compatibility
  |--------------------------------------------------------------------------
  | We have not yet inspected WhatsappLog.model.js.
  | Its purpose field may be an enum.
  */
  purpose = "manual",

  logMessage = "",
}) => {
  const phone = normalizePhoneNumber(to)

  const safeLogMessage =
    logMessage ||
    `WhatsApp template: ${templateName || "unknown"}`

  const log = await WhatsappLog.create({
    lead,
    contactInquiry,
    phone,
    purpose,
    message: safeLogMessage,

    provider: env.WHATSAPP_ENABLED
      ? "meta_whatsapp_cloud"
      : "disabled",

    status: env.WHATSAPP_ENABLED
      ? "pending"
      : "skipped",
  })

  if (!env.WHATSAPP_ENABLED) {
    log.errorMessage =
      "WhatsApp is disabled in environment settings."

    await log.save()

    return {
      success: false,
      skipped: true,
      log,
    }
  }

  if (
    !env.WHATSAPP_PHONE_NUMBER_ID ||
    !env.WHATSAPP_ACCESS_TOKEN ||
    !phone ||
    !templateName
  ) {
    log.status = "failed"

    log.errorMessage =
      "Missing WhatsApp credentials, recipient phone, or template name."

    await log.save()

    return {
      success: false,
      log,
    }
  }

  const endpoint =
    `https://graph.facebook.com/` +
    `${env.WHATSAPP_GRAPH_API_VERSION}/` +
    `${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",

        to: phone,

        type: "template",

        template: {
          name: templateName,

          language: {
            code: languageCode,
          },

          components,
        },
      }),
    })

    const data = await response.json()

    log.rawResponse = data

    if (!response.ok) {
      log.status = "failed"

      log.errorMessage =
        data?.error?.message ||
        "WhatsApp template message failed to send."

      await log.save()

      return {
        success: false,
        log,
        response: data,
      }
    }

    log.status = "sent"

    log.providerMessageId =
      data?.messages?.[0]?.id || ""

    log.sentAt = new Date()

    await log.save()

    return {
      success: true,
      log,
      response: data,
    }
  } catch (error) {
    log.status = "failed"

    log.errorMessage =
      error.message ||
      "WhatsApp template request failed."

    await log.save()

    return {
      success: false,
      log,
      error,
    }
  }
}

/*
|--------------------------------------------------------------------------
| Daily consultant follow-up digest
|--------------------------------------------------------------------------
| This is what your reminder service will call.
|
| Expected approved template body:
|
| Hello {{1}},
| You have {{2}} scheduled follow-ups today.
|
| {{3}}
|
| Open CRM: {{4}}
*/
export const sendFollowUpDigestWhatsApp = async ({
  consultant,
  followUps = [],
  crmUrl = "",
  templateName,
  languageCode = "en_US",
}) => {
  if (!consultant) {
    return {
      success: false,
      skipped: true,
      reason: "Consultant is required.",
    }
  }

  if (!consultant.reminderPreferences?.whatsapp) {
    return {
      success: false,
      skipped: true,
      reason:
        "WhatsApp reminders are disabled for this consultant.",
    }
  }

  if (!consultant.whatsappNumber) {
    return {
      success: false,
      skipped: true,
      reason:
        "Consultant WhatsApp number is missing.",
    }
  }

  if (!Array.isArray(followUps) || followUps.length === 0) {
    return {
      success: false,
      skipped: true,
      reason:
        "No scheduled follow-ups found.",
    }
  }

  if (!templateName) {
    return {
      success: false,
      skipped: true,
      reason:
        "Approved WhatsApp reminder template name is missing.",
    }
  }

  const digestLines = formatFollowUpDigestLines(
    followUps
  )

  const fullMessage = formatFollowUpDigestMessage({
    consultant,
    followUps,
    crmUrl,
  })

  return sendWhatsAppTemplateMessage({
    to: consultant.whatsappNumber,

    templateName,

    languageCode,

    /*
    |--------------------------------------------------------------------------
    | Template body variables
    |--------------------------------------------------------------------------
    | {{1}} consultant name
    | {{2}} number of follow-ups
    | {{3}} formatted follow-up list
    | {{4}} CRM URL
    */
    components: [
      {
        type: "body",

        parameters: [
          {
            type: "text",
            text:
              consultant.name ||
              "Consultant",
          },

          {
            type: "text",
            text: String(followUps.length),
          },

          {
            type: "text",
            text:
              digestLines ||
              "Please review your scheduled follow-ups.",
          },

          {
            type: "text",
            text:
              crmUrl ||
              "TravelEx CRM",
          },
        ],
      },
    ],

    /*
    |--------------------------------------------------------------------------
    | Temporary compatible purpose
    |--------------------------------------------------------------------------
    | We will change this to "follow_up_digest"
    | after inspecting WhatsappLog.model.js.
    */
    purpose: "manual",

    logMessage: fullMessage,
  })
}

/*
|--------------------------------------------------------------------------
| Existing lead notifications
|--------------------------------------------------------------------------
| Preserved exactly in behavior.
*/
export const sendLeadWhatsAppNotifications = async (lead) => {
  const tasks = []

  if (env.TRAVELEX_ADMIN_WHATSAPP) {
    tasks.push(
      sendWhatsAppTextMessage({
        to: env.TRAVELEX_ADMIN_WHATSAPP,

        message: formatLeadMessageForAdmin(lead),

        lead: lead._id,

        purpose: "admin_lead_alert",
      })
    )
  }

  if (env.WHATSAPP_SEND_CUSTOMER_CONFIRMATION) {
    tasks.push(
      sendWhatsAppTextMessage({
        to: lead.phone,

        message:
          formatCustomerConfirmationMessage(lead),

        lead: lead._id,

        purpose: "customer_confirmation",
      })
    )
  }

  if (tasks.length === 0) {
    return []
  }

  return Promise.allSettled(tasks)
}