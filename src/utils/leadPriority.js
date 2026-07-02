const PRIORITY_ORDER = ["low", "medium", "high", "urgent"]

const CLOSED_STATUSES = new Set(["Lost", "Cancelled", "Confirmed", "Booked"])

const ACTIVE_URGENT_STATUSES = new Set([
  "Awaiting Documents",
  "Payment Pending",
])

const SALES_ACTIVE_STATUSES = new Set(["Interested", "Quoted"])

const getValidDate = (value) => {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date
}

export const getPrimaryTravelDate = (lead = {}) => {
  const serviceType = lead.serviceType

  const serviceDateFields = {
    visa: ["travelDate", "returnDate"],
    umrah: ["travelDate", "returnDate"],
    tour: ["travelDate", "returnDate"],
    ticket: ["travelDate", "returnDate"],
    hotel: ["checkInDate", "travelDate", "checkOutDate"],
    carRental: ["pickupDate", "travelDate", "returnDate"],
    contact: ["travelDate", "pickupDate", "checkInDate"],
    general: ["travelDate", "pickupDate", "checkInDate"],
  }

  const fields = serviceDateFields[serviceType] || [
    "travelDate",
    "pickupDate",
    "checkInDate",
    "returnDate",
    "checkOutDate",
  ]

  for (const field of fields) {
    const date = getValidDate(lead[field])

    if (date) {
      return date
    }
  }

  return null
}

export const getDaysUntilTravel = (lead = {}) => {
  const travelDate = getPrimaryTravelDate(lead)

  if (!travelDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(travelDate)
  targetDate.setHours(0, 0, 0, 0)

  const diffInMs = targetDate.getTime() - today.getTime()

  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
}

const increasePriority = (priority, steps = 1) => {
  const currentIndex = PRIORITY_ORDER.indexOf(priority)

  if (currentIndex === -1) return priority

  const nextIndex = Math.min(currentIndex + steps, PRIORITY_ORDER.length - 1)

  return PRIORITY_ORDER[nextIndex]
}

const getDateBasedPriority = (serviceType, daysUntilTravel) => {
  if (daysUntilTravel === null) {
    return "medium"
  }

  if (daysUntilTravel < 0) {
    return "low"
  }

  if (serviceType === "visa") {
    if (daysUntilTravel <= 14) return "urgent"
    if (daysUntilTravel <= 30) return "high"
    if (daysUntilTravel <= 90) return "medium"
    return "low"
  }

  if (serviceType === "umrah" || serviceType === "tour") {
    if (daysUntilTravel <= 7) return "urgent"
    if (daysUntilTravel <= 21) return "high"
    if (daysUntilTravel <= 60) return "medium"
    return "low"
  }

  if (
    serviceType === "ticket" ||
    serviceType === "hotel" ||
    serviceType === "carRental"
  ) {
    if (daysUntilTravel <= 2) return "urgent"
    if (daysUntilTravel <= 7) return "high"
    if (daysUntilTravel <= 30) return "medium"
    return "low"
  }

  if (daysUntilTravel <= 3) return "urgent"
  if (daysUntilTravel <= 14) return "high"
  if (daysUntilTravel <= 45) return "medium"
  return "low"
}

const isFollowUpOverdue = (lead = {}) => {
  if (!lead.followUpDate || lead.followUpStatus !== "Scheduled") return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const followUpDate = new Date(lead.followUpDate)
  followUpDate.setHours(0, 0, 0, 0)

  return followUpDate < today
}

const isFollowUpToday = (lead = {}) => {
  if (!lead.followUpDate || lead.followUpStatus !== "Scheduled") return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const followUpDate = new Date(lead.followUpDate)

  return followUpDate >= today && followUpDate < tomorrow
}

export const calculateLeadPriority = (lead = {}) => {
  if (CLOSED_STATUSES.has(lead.status)) {
    return "low"
  }

  const daysUntilTravel = getDaysUntilTravel(lead)
  let priority = getDateBasedPriority(lead.serviceType, daysUntilTravel)

  if (daysUntilTravel === null) {
    if (ACTIVE_URGENT_STATUSES.has(lead.status)) {
      return "high"
    }

    if (SALES_ACTIVE_STATUSES.has(lead.status)) {
      return "medium"
    }

    return "medium"
  }

  if (ACTIVE_URGENT_STATUSES.has(lead.status)) {
    priority = increasePriority(priority, 1)
  }

  if (SALES_ACTIVE_STATUSES.has(lead.status) && priority === "low") {
    priority = "medium"
  }

  if (isFollowUpOverdue(lead) || isFollowUpToday(lead)) {
    priority = increasePriority(priority, 1)
  }

  return priority
}

export const syncLeadPriorities = async (LeadModel) => {
  const leads = await LeadModel.find({ isArchived: false })
    .select(
      "_id priority serviceType status travelDate returnDate pickupDate checkInDate checkOutDate followUpDate followUpStatus"
    )
    .lean()

  const updates = leads
    .map((lead) => {
      const calculatedPriority = calculateLeadPriority(lead)

      if (lead.priority === calculatedPriority) {
        return null
      }

      return {
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              priority: calculatedPriority,
            },
          },
        },
      }
    })
    .filter(Boolean)

  if (updates.length) {
    await LeadModel.bulkWrite(updates)
  }

  return {
    checked: leads.length,
    updated: updates.length,
  }
}