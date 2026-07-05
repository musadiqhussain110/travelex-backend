export const openSalesStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Awaiting Documents",
  "Payment Pending",
]

export const closedLeadStatuses = [
  "Booked",
  "Lost",
  "Cancelled",
]

/*
|--------------------------------------------------------------------------
| Normalize date-only values
|--------------------------------------------------------------------------
| Stores/computes follow-up dates consistently as UTC midnight.
|
| Example:
| 2026-07-05
| →
| 2026-07-05T00:00:00.000Z
*/
export const normalizeDateOnly = (value) => {
  if (!value) return null

  if (typeof value === "string") {
    const datePart = value.slice(0, 10)

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return new Date(
        `${datePart}T00:00:00.000Z`
      )
    }
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate()
    )
  )
}

/*
|--------------------------------------------------------------------------
| Get calendar date key for a specific timezone
|--------------------------------------------------------------------------
| Important for production deployment.
|
| Render/server machine timezone may be UTC, while TravelEx CRM operates
| according to Pakistan time.
|
| Example:
| 2026-07-05 in Asia/Karachi
| →
| "2026-07-05"
*/
const getDateKeyInTimeZone = (
  date = new Date(),
  timeZone = "Asia/Karachi"
) => {
  const parsedDate =
    date instanceof Date
      ? date
      : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(parsedDate)

  const values = {}

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value
    }
  })

  if (
    !values.year ||
    !values.month ||
    !values.day
  ) {
    return null
  }

  return `${values.year}-${values.month}-${values.day}`
}

/*
|--------------------------------------------------------------------------
| Today's follow-up date range
|--------------------------------------------------------------------------
| Calendar day is determined using Pakistan time:
| Asia/Karachi
|
| Follow-up dates themselves are stored as UTC date-only values.
|
| Example:
| Pakistan date = 2026-07-05
|
| Query range:
| start = 2026-07-05T00:00:00.000Z
| end   = 2026-07-06T00:00:00.000Z
*/
export const getTodayDateRange = (
  date = new Date()
) => {
  const datePart = getDateKeyInTimeZone(
    date,
    "Asia/Karachi"
  )

  if (!datePart) {
    return {
      start: null,
      end: null,
    }
  }

  const start = new Date(
    `${datePart}T00:00:00.000Z`
  )

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return {
    start,
    end,
  }
}

/*
|--------------------------------------------------------------------------
| Tomorrow's follow-up date range
|--------------------------------------------------------------------------
| Based on today's Pakistan calendar date.
*/
export const getTomorrowDateRange = (
  date = new Date()
) => {
  const today = getTodayDateRange(date)

  if (!today.start || !today.end) {
    return {
      start: null,
      end: null,
    }
  }

  const start = new Date(today.end)

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return {
    start,
    end,
  }
}

/*
|--------------------------------------------------------------------------
| Leads with no scheduled sales follow-up
|--------------------------------------------------------------------------
*/
export const getNoSalesFollowUpCondition = () => {
  return {
    status: {
      $in: openSalesStatuses,
    },

    $or: [
      {
        followUpDate: {
          $exists: false,
        },
      },

      {
        followUpDate: null,
      },

      {
        followUpStatus: {
          $exists: false,
        },
      },

      {
        followUpStatus: null,
      },

      {
        followUpStatus: "",
      },

      {
        followUpStatus: "Not Set",
      },
    ],
  }
}