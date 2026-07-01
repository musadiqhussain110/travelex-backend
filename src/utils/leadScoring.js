const ACTIVE_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Awaiting Documents",
  "Quoted",
  "Payment Pending",
]

const CLOSED_STATUSES = ["Confirmed", "Booked", "Lost", "Cancelled"]

const HIGH_VALUE_SERVICES = ["umrah", "tour", "visa", "hotel"]

const getNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const getTravelerCount = (lead = {}) => {
  const travelers = lead.travelers || {}

  return (
    getNumber(travelers.adults) +
    getNumber(travelers.children) +
    getNumber(travelers.infants) +
    getNumber(lead.numberOfGuests) +
    getNumber(lead.numberOfApplicants) +
    getNumber(lead.passengerCount)
  )
}

const getPrimaryTravelDate = (lead = {}) => {
  return (
    lead.travelDate ||
    lead.departureDate ||
    lead.pickupDate ||
    lead.checkInDate ||
    lead.intendedTravelDate ||
    lead.preferredDepartureDate ||
    null
  )
}

export const isSmartFollowUpOverdue = (lead = {}) => {
  if (!lead.followUpDate || lead.followUpStatus !== "Scheduled") return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const followUpDate = new Date(lead.followUpDate)
  followUpDate.setHours(0, 0, 0, 0)

  return followUpDate < today
}

export const isSmartFollowUpToday = (lead = {}) => {
  if (!lead.followUpDate || lead.followUpStatus !== "Scheduled") return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const followUpDate = new Date(lead.followUpDate)

  return followUpDate >= today && followUpDate < tomorrow
}

export const getTravelUrgency = (lead = {}) => {
  const date = getPrimaryTravelDate(lead)

  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const travelDate = new Date(date)
  travelDate.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((travelDate - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "Past Date"
  if (diffDays <= 3) return "Very Urgent"
  if (diffDays <= 10) return "Soon"
  if (diffDays <= 30) return "Planned"
  return "Future"
}

export const getSmartLeadScore = (lead = {}) => {
  let score = 30
  const reasons = []
  const tags = []

  const status = lead.status || "New"
  const priority = lead.priority || "medium"
  const serviceType = lead.serviceType || "general"
  const messageText = [
    lead.message,
    lead.additionalRequirements,
    lead.followUpNote,
    lead.destination,
    lead.destinationCountry,
  ]
    .filter(Boolean)
    .join(" ")

  const travelerCount = getTravelerCount(lead)
  const travelUrgency = getTravelUrgency(lead)
  const overdue = isSmartFollowUpOverdue(lead)
  const todayFollowUp = isSmartFollowUpToday(lead)

  const isClosed = CLOSED_STATUSES.includes(status)
  const needsFollowUp =
    ACTIVE_STATUSES.includes(status) &&
    (!lead.followUpDate || lead.followUpStatus === "Not Set")

  const highValue =
    HIGH_VALUE_SERVICES.includes(serviceType) &&
    (priority === "high" ||
      priority === "urgent" ||
      travelerCount >= 3 ||
      messageText.length >= 120)

  if (priority === "urgent") {
    score += 28
    reasons.push("Urgent priority")
  } else if (priority === "high") {
    score += 20
    reasons.push("High priority")
  } else if (priority === "medium") {
    score += 10
    reasons.push("Medium priority")
  } else {
    score += 3
  }

  if (status === "New") {
    score += 8
    reasons.push("Fresh lead")
  }

  if (status === "Contacted") {
    score += 12
    reasons.push("Customer contacted")
  }

  if (status === "Interested") {
    score += 24
    reasons.push("Customer is interested")
  }

  if (status === "Awaiting Documents") {
    score += 22
    reasons.push("Documents pending")
  }

  if (status === "Quoted") {
    score += 25
    reasons.push("Quotation shared")
  }

  if (status === "Payment Pending") {
    score += 30
    reasons.push("Payment pending")
  }

  if (status === "Confirmed" || status === "Booked") {
    score += 38
    reasons.push("Converted lead")
  }

  if (status === "Lost" || status === "Cancelled") {
    score -= 28
    reasons.push("Closed lost/cancelled")
  }

  if (overdue) {
    score += 22
    reasons.push("Follow-up overdue")
  } else if (todayFollowUp) {
    score += 16
    reasons.push("Follow-up due today")
  } else if (lead.followUpDate && lead.followUpStatus === "Scheduled") {
    score += 8
    reasons.push("Follow-up scheduled")
  }

  if (needsFollowUp) {
    score += 10
    reasons.push("Needs follow-up")
  }

  if (highValue) {
    score += 16
    reasons.push("High value inquiry")
  }

  if (HIGH_VALUE_SERVICES.includes(serviceType)) {
    score += 8
    reasons.push("High-value service")
  }

  if (lead.phone) score += 6
  if (lead.email) score += 4

  if (messageText.length >= 250) {
    score += 12
    reasons.push("Detailed customer requirement")
  } else if (messageText.length >= 100) {
    score += 7
    reasons.push("Good requirement detail")
  }

  if (travelerCount >= 5) {
    score += 12
    reasons.push("Group/family inquiry")
  } else if (travelerCount >= 3) {
    score += 8
    reasons.push("Multiple travelers")
  }

  if (travelUrgency === "Very Urgent") {
    score += 18
    reasons.push("Travel date very near")
  } else if (travelUrgency === "Soon") {
    score += 10
    reasons.push("Travel date soon")
  } else if (travelUrgency === "Past Date") {
    score -= 6
    reasons.push("Travel date passed")
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  const temperature =
    score >= 80
      ? {
          label: "Hot Lead",
          className: "bg-red-50 text-red-700",
          dotClassName: "bg-red-500",
        }
      : score >= 60
        ? {
            label: "Warm Lead",
            className: "bg-orange-50 text-[#FF6B00]",
            dotClassName: "bg-[#FF6B00]",
          }
        : {
            label: "Cold Lead",
            className: "bg-slate-100 text-slate-600",
            dotClassName: "bg-slate-400",
          }

  tags.push(temperature)

  if (overdue) {
    tags.unshift({
      label: "Overdue",
      className: "bg-red-50 text-red-700",
      dotClassName: "bg-red-500",
    })
  }

  if (needsFollowUp) {
    tags.push({
      label: "Needs Follow-up",
      className: "bg-sky-50 text-[#00AEEF]",
      dotClassName: "bg-[#00AEEF]",
    })
  }

  if (highValue) {
    tags.push({
      label: "High Value",
      className: "bg-emerald-50 text-emerald-700",
      dotClassName: "bg-emerald-500",
    })
  }

  if (todayFollowUp) {
    tags.push({
      label: "Today Follow-up",
      className: "bg-purple-50 text-purple-700",
      dotClassName: "bg-purple-500",
    })
  }

  return {
    score,
    temperature,
    tags,
    reasons: reasons.slice(0, 4),
    travelUrgency,
    highValue,
    overdue,
    needsFollowUp,
    todayFollowUp,
  }
}