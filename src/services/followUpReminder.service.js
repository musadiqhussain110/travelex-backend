import Lead from "../models/Lead.model.js"
import FollowUpReminder from "../models/FollowUpReminder.model.js"

import { sendFollowUpDigestEmail } from "./email.service.js"

import {
  openSalesStatuses,
  getTodayDateRange,
} from "../utils/followUpDate.utils.js"

/*
|--------------------------------------------------------------------------
| Pakistan date helpers
|--------------------------------------------------------------------------
*/
const getPakistanDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date)

  const values = {}

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value
    }
  })

  return `${values.year}-${values.month}-${values.day}`
}

const getPakistanDateLabel = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

const getCrmFollowUpsUrl = () => {
  if (process.env.CRM_FOLLOW_UPS_URL) {
    return process.env.CRM_FOLLOW_UPS_URL
  }

  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.APP_URL ||
    ""

  if (!frontendUrl) {
    return ""
  }

  return `${frontendUrl.replace(
    /\/+$/,
    ""
  )}/admin/follow-ups`
}

const sortFollowUps = (followUps = []) => {
  return [...followUps].sort((a, b) => {
    const timeA = String(
      a.followUpTime || "99:99"
    )

    const timeB = String(
      b.followUpTime || "99:99"
    )

    const timeCompare =
      timeA.localeCompare(timeB)

    if (timeCompare !== 0) {
      return timeCompare
    }

    return String(a.name || "").localeCompare(
      String(b.name || "")
    )
  })
}

/*
|--------------------------------------------------------------------------
| Group follow-ups by assigned consultant
|--------------------------------------------------------------------------
*/
const groupFollowUpsByConsultant = (
  followUps = []
) => {
  const groups = new Map()
  const unassigned = []

  followUps.forEach((lead) => {
    const consultant = lead.assignedTo

    if (
      !consultant ||
      !consultant._id ||
      consultant.isActive === false
    ) {
      unassigned.push(lead)
      return
    }

    const consultantId = String(
      consultant._id
    )

    if (!groups.has(consultantId)) {
      groups.set(consultantId, {
        consultant,
        followUps: [],
      })
    }

    groups
      .get(consultantId)
      .followUps
      .push(lead)
  })

  return {
    groups,
    unassigned,
  }
}

/*
|--------------------------------------------------------------------------
| Claim a reminder record
|--------------------------------------------------------------------------
| Prevents duplicate sends.
|
| Rules:
| sent     → skip
| pending  → skip because another process may be sending
| failed   → retry
| skipped  → retry
|--------------------------------------------------------------------------
*/
const claimReminderRecord = async ({
  consultant,
  reminderDate,
  reminderDateKey,
  channel,
  recipient,
  followUps,
}) => {
  const filter = {
    consultant: consultant._id,
    reminderDateKey,
    reminderType: "daily-digest",
    channel,
  }

  const leadIds = followUps.map(
    (lead) => lead._id
  )

  try {
    const record =
      await FollowUpReminder.create({
        consultant: consultant._id,
        reminderDate,
        reminderDateKey,

        reminderType: "daily-digest",

        channel,

        status: "pending",

        recipient,

        followUpCount: followUps.length,

        leadIds,

        lastAttemptAt: new Date(),

        attemptCount: 1,
      })

    return {
      shouldSend: true,
      record,
      reason: "created",
    }
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Duplicate record
    |--------------------------------------------------------------------------
    */
    if (error?.code !== 11000) {
      throw error
    }

    const existingRecord =
      await FollowUpReminder.findOne(filter)

    if (!existingRecord) {
      throw error
    }

    if (existingRecord.status === "sent") {
      return {
        shouldSend: false,
        record: existingRecord,
        reason: "already_sent",
      }
    }

    if (existingRecord.status === "pending") {
      return {
        shouldSend: false,
        record: existingRecord,
        reason: "already_processing",
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Retry failed or skipped reminder
    |--------------------------------------------------------------------------
    */
    existingRecord.status = "pending"

    existingRecord.recipient =
      recipient || existingRecord.recipient

    existingRecord.followUpCount =
      followUps.length

    existingRecord.leadIds = leadIds

    existingRecord.lastAttemptAt =
      new Date()

    existingRecord.attemptCount =
      Number(existingRecord.attemptCount || 0) + 1

    existingRecord.errorMessage = ""

    await existingRecord.save()

    return {
      shouldSend: true,
      record: existingRecord,
      reason: "retry",
    }
  }
}

const markReminderSent = async (
  record,
  result = {}
) => {
  record.status = "sent"

  record.provider =
    result.provider ||
    record.provider ||
    ""

  record.providerMessageId =
    result.providerMessageId ||
    result.log?.providerMessageId ||
    ""

  record.sentAt = new Date()

  record.errorMessage = ""

  record.metadata = {
    ...(record.metadata || {}),
    lastResult: {
      success: true,
      sentAt: new Date(),
    },
  }

  await record.save()
}

const markReminderSkipped = async (
  record,
  result = {}
) => {
  record.status = "skipped"

  record.errorMessage =
    result.reason ||
    "Reminder was skipped."

  record.metadata = {
    ...(record.metadata || {}),
    lastResult: {
      success: false,
      skipped: true,
      reason:
        result.reason ||
        "Reminder was skipped.",
      attemptedAt: new Date(),
    },
  }

  await record.save()
}

const markReminderFailed = async (
  record,
  result = {}
) => {
  record.status = "failed"

  record.provider =
    result.provider ||
    record.provider ||
    ""

  record.errorMessage =
    result.error ||
    result.reason ||
    result.log?.errorMessage ||
    "Reminder failed to send."

  record.metadata = {
    ...(record.metadata || {}),
    lastResult: {
      success: false,
      error:
        result.error ||
        result.reason ||
        "Reminder failed to send.",
      attemptedAt: new Date(),
    },
  }

  await record.save()
}

/*
|--------------------------------------------------------------------------
| Send email reminder
|--------------------------------------------------------------------------
*/
const processEmailReminder = async ({
  consultant,
  followUps,
  reminderDate,
  reminderDateKey,
  crmUrl,
}) => {
  /*
  |--------------------------------------------------------------------------
  | Existing Admin records may not yet contain reminderPreferences.
  |
  | Email defaults to enabled unless explicitly false.
  |--------------------------------------------------------------------------
  */
  const emailEnabled =
    consultant.reminderPreferences?.email !== false

  if (!emailEnabled) {
    return {
      channel: "email",
      success: false,
      skipped: true,
      reason:
        "Email reminders are disabled for consultant.",
    }
  }

  if (!consultant.email) {
    return {
      channel: "email",
      success: false,
      skipped: true,
      reason:
        "Consultant email address is missing.",
    }
  }

  const claim =
    await claimReminderRecord({
      consultant,
      reminderDate,
      reminderDateKey,
      channel: "email",
      recipient: consultant.email,
      followUps,
    })

  if (!claim.shouldSend) {
    return {
      channel: "email",
      success:
        claim.reason === "already_sent",
      skipped: true,
      reason: claim.reason,
    }
  }

  const { record } = claim

  try {
    const result =
      await sendFollowUpDigestEmail({
        consultant,
        followUps,
        crmUrl,
        reminderDate,
      })

    if (result.success) {
      await markReminderSent(
        record,
        result
      )

      return {
        channel: "email",
        success: true,
        providerMessageId:
          result.providerMessageId || "",
      }
    }

    if (result.skipped) {
      await markReminderSkipped(
        record,
        result
      )

      return {
        channel: "email",
        ...result,
      }
    }

    await markReminderFailed(
      record,
      result
    )

    return {
      channel: "email",
      ...result,
    }
  } catch (error) {
    await markReminderFailed(record, {
      error:
        error.message ||
        "Email reminder failed.",
    })

    return {
      channel: "email",
      success: false,
      error:
        error.message ||
        "Email reminder failed.",
    }
  }
}

/*
|--------------------------------------------------------------------------
| Send WhatsApp reminder
|--------------------------------------------------------------------------
| WhatsApp template can be configured later.
|
| Until then:
| - no crash
| - no broken cron
| - reminder is safely skipped
|--------------------------------------------------------------------------
*/
const processWhatsAppReminder = async ({
  consultant,
  followUps,
  reminderDate,
  reminderDateKey,
  crmUrl,
}) => {
  const whatsappEnabled =
    consultant.reminderPreferences?.whatsapp ===
    true

  if (!whatsappEnabled) {
    return {
      channel: "whatsapp",
      success: false,
      skipped: true,
      reason:
        "WhatsApp reminders are disabled for consultant.",
    }
  }

  if (!consultant.whatsappNumber) {
    return {
      channel: "whatsapp",
      success: false,
      skipped: true,
      reason:
        "Consultant WhatsApp number is missing.",
    }
  }

  const claim =
    await claimReminderRecord({
      consultant,
      reminderDate,
      reminderDateKey,
      channel: "whatsapp",
      recipient: consultant.whatsappNumber,
      followUps,
    })

  if (!claim.shouldSend) {
    return {
      channel: "whatsapp",
      success:
        claim.reason === "already_sent",
      skipped: true,
      reason: claim.reason,
    }
  }

  const { record } = claim

  try {
    /*
    |--------------------------------------------------------------------------
    | Dynamic import
    |--------------------------------------------------------------------------
    | This allows the reminder engine to exist even before the WhatsApp
    | template helper has been fully configured.
    |--------------------------------------------------------------------------
    */
    const whatsappService = await import(
      "./whatsapp.service.js"
    )

    if (
      !whatsappService
        .sendFollowUpDigestWhatsApp
    ) {
      const result = {
        success: false,
        skipped: true,
        reason:
          "WhatsApp follow-up digest function is not available yet.",
      }

      await markReminderSkipped(
        record,
        result
      )

      return {
        channel: "whatsapp",
        ...result,
      }
    }

    const templateName =
      process.env
        .WHATSAPP_FOLLOWUP_TEMPLATE_NAME ||
      ""

    const languageCode =
      process.env
        .WHATSAPP_FOLLOWUP_TEMPLATE_LANGUAGE ||
      "en_US"

    if (!templateName) {
      const result = {
        success: false,
        skipped: true,
        reason:
          "WhatsApp follow-up template is not configured yet.",
      }

      await markReminderSkipped(
        record,
        result
      )

      return {
        channel: "whatsapp",
        ...result,
      }
    }

    const result =
      await whatsappService
        .sendFollowUpDigestWhatsApp({
          consultant,
          followUps,
          crmUrl,
          templateName,
          languageCode,
        })

    if (result.success) {
      await markReminderSent(record, {
        ...result,
        provider:
          "meta_whatsapp_cloud",
      })

      return {
        channel: "whatsapp",
        success: true,
      }
    }

    if (result.skipped) {
      await markReminderSkipped(
        record,
        result
      )

      return {
        channel: "whatsapp",
        ...result,
      }
    }

    await markReminderFailed(
      record,
      result
    )

    return {
      channel: "whatsapp",
      ...result,
    }
  } catch (error) {
    await markReminderFailed(record, {
      error:
        error.message ||
        "WhatsApp reminder failed.",
    })

    return {
      channel: "whatsapp",
      success: false,
      error:
        error.message ||
        "WhatsApp reminder failed.",
    }
  }
}

/*
|--------------------------------------------------------------------------
| Main daily reminder engine
|--------------------------------------------------------------------------
*/
export const runDailyFollowUpReminders =
  async () => {
    const now = new Date()

    const {
      start,
      end,
    } = getTodayDateRange()

    const reminderDateKey =
      getPakistanDateKey(now)

    const reminderDate = start

    const crmUrl =
      getCrmFollowUpsUrl()

    /*
    |--------------------------------------------------------------------------
    | Find today's active scheduled follow-ups
    |--------------------------------------------------------------------------
    */
    const followUps = await Lead.find({
      isArchived: false,

      status: {
        $in: openSalesStatuses,
      },

      followUpStatus: "Scheduled",

      followUpDate: {
        $gte: start,
        $lt: end,
      },
    })
      .populate(
        "assignedTo",
        [
          "name",
          "email",
          "role",
          "isActive",
          "whatsappNumber",
          "reminderPreferences",
        ].join(" ")
      )
      .sort({
        followUpTime: 1,
        createdAt: 1,
      })
      .lean()

    const {
      groups,
      unassigned,
    } = groupFollowUpsByConsultant(
      followUps
    )

    const consultantResults = []

    /*
    |--------------------------------------------------------------------------
    | One digest per consultant
    |--------------------------------------------------------------------------
    */
    for (const {
      consultant,
      followUps: consultantFollowUps,
    } of groups.values()) {
      const sortedFollowUps =
        sortFollowUps(
          consultantFollowUps
        )

      const emailResult =
        await processEmailReminder({
          consultant,
          followUps: sortedFollowUps,
          reminderDate,
          reminderDateKey,
          crmUrl,
        })

      const whatsappResult =
        await processWhatsAppReminder({
          consultant,
          followUps: sortedFollowUps,
          reminderDate,
          reminderDateKey,
          crmUrl,
        })

      consultantResults.push({
        consultant: {
          id: consultant._id,
          name: consultant.name,
          email: consultant.email,
          whatsappNumber:
            consultant.whatsappNumber || "",
        },

        followUpCount:
          sortedFollowUps.length,

        channels: {
          email: emailResult,
          whatsapp: whatsappResult,
        },
      })
    }

    const totalAssignedFollowUps =
      consultantResults.reduce(
        (total, item) =>
          total + item.followUpCount,
        0
      )

    return {
      success: true,

      date: {
        key: reminderDateKey,
        label:
          getPakistanDateLabel(now),
        start,
        end,
      },

      summary: {
        totalFollowUps:
          followUps.length,

        assignedFollowUps:
          totalAssignedFollowUps,

        unassignedFollowUps:
          unassigned.length,

        consultants:
          consultantResults.length,
      },

      consultants:
        consultantResults,

      unassignedLeads:
        unassigned.map((lead) => ({
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          serviceType:
            lead.serviceType,
          followUpTime:
            lead.followUpTime || "",
          followUpNote:
            lead.followUpNote || "",
        })),
    }
  }