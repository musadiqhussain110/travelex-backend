export const openSalesStatuses = [
  "New",
  "Contacted",
  "Interested",
  "Awaiting Documents",
  "Quoted",
  "Payment Pending",
]

export const closedLeadStatuses = [
  "Confirmed",
  "Booked",
  "Lost",
  "Cancelled",
]

export const normalizeDateOnly = (value) => {
  if (!value) return null

  if (typeof value === "string") {
    const datePart = value.slice(0, 10)

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return new Date(`${datePart}T00:00:00.000Z`)
    }
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) return null

  return new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate()
    )
  )
}

export const getTodayDateRange = () => {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  const datePart = localDate.toISOString().slice(0, 10)

  const start = new Date(`${datePart}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export const getTomorrowDateRange = () => {
  const today = getTodayDateRange()

  const start = new Date(today.end)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return { start, end }
}

export const getNoSalesFollowUpCondition = () => {
  return {
    status: { $in: openSalesStatuses },
    $or: [
      { followUpDate: { $exists: false } },
      { followUpDate: null },
      { followUpStatus: { $exists: false } },
      { followUpStatus: null },
      { followUpStatus: "" },
      { followUpStatus: "Not Set" },
    ],
  }
}