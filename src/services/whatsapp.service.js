import { env } from "../config/env.js"
import WhatsappLog from "../models/WhatsappLog.model.js"

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

const formatLeadMessageForAdmin = (lead) => {
  const travelers = lead.travelers || {}

  return [
    "New TravelEx Lead",
    "",
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Service: ${formatServiceType(lead.serviceType)}`,
    lead.destination ? `Destination: ${lead.destination}` : null,
    lead.budget ? `Budget: ${lead.budget}` : null,
    lead.travelDate
      ? `Travel Date: ${new Date(lead.travelDate).toLocaleDateString("en-GB")}`
      : null,
    travelers.adults || travelers.children || travelers.infants
      ? `Travelers: ${travelers.adults || 1} adult(s), ${
          travelers.children || 0
        } child(ren), ${travelers.infants || 0} infant(s)`
      : null,
    lead.makkahNights ? `Makkah Nights: ${lead.makkahNights}` : null,
    lead.madinahNights ? `Madinah Nights: ${lead.madinahNights}` : null,
    lead.pickupLocation ? `Pickup: ${lead.pickupLocation}` : null,
    lead.dropoffLocation ? `Drop-off: ${lead.dropoffLocation}` : null,
    lead.message ? `Message: ${lead.message}` : null,
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
    provider: env.WHATSAPP_ENABLED ? "meta_whatsapp_cloud" : "disabled",
    status: env.WHATSAPP_ENABLED ? "pending" : "skipped",
  })

  if (!env.WHATSAPP_ENABLED) {
    log.errorMessage = "WhatsApp is disabled in environment settings."
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

  const endpoint = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`

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
        data?.error?.message || "WhatsApp message failed to send."
      await log.save()

      return {
        success: false,
        log,
        response: data,
      }
    }

    log.status = "sent"
    log.providerMessageId = data?.messages?.[0]?.id || ""
    log.sentAt = new Date()
    await log.save()

    return {
      success: true,
      log,
      response: data,
    }
  } catch (error) {
    log.status = "failed"
    log.errorMessage = error.message || "WhatsApp request failed."
    await log.save()

    return {
      success: false,
      log,
      error,
    }
  }
}

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
        message: formatCustomerConfirmationMessage(lead),
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