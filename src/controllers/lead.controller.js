import Lead from "../models/Lead.model.js"
import Admin from "../models/Admin.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { createNotification } from "../services/notification.service.js"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const allowedSortValues = new Set([
  "createdAt",
  "-createdAt",
  "updatedAt",
  "-updatedAt",
  "followUpDate",
  "-followUpDate",
  "status",
  "-status",
  "priority",
  "-priority",
  "serviceType",
  "-serviceType",
  "name",
  "-name",
])

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const getPositiveNumber = (value, fallback) => {
  const number = Number(value)

  if (!Number.isFinite(number) || number < 1) {
    return fallback
  }

  return Math.floor(number)
}

const getPaginationParams = (page, limit) => {
  const safePage = getPositiveNumber(page, DEFAULT_PAGE)
  const requestedLimit = getPositiveNumber(limit, DEFAULT_LIMIT)
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT)
  const skip = (safePage - 1) * safeLimit

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  }
}

const getSortValue = (sort) => {
  if (!sort) return "-createdAt"

  return allowedSortValues.has(sort) ? sort : "-createdAt"
}

const getTodayRange = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

const buildLeadFilter = (query = {}) => {
  const {
    search,
    status,
    serviceType,
    source,
    priority,
    followUpStatus,
    followUp,
    assignedTo,
    includeArchived,
  } = query

  const filter = {}
  const andConditions = []

  const shouldIncludeArchived =
    includeArchived === true || includeArchived === "true"

  if (!shouldIncludeArchived) {
    filter.isArchived = false
  }

  if (status) {
    filter.status = status
  }

  if (serviceType) {
    filter.serviceType = serviceType
  }

  if (source) {
    filter.source = source
  }

  if (priority) {
    filter.priority = priority
  }

  if (followUpStatus) {
    filter.followUpStatus = followUpStatus
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo
  }

  if (followUp) {
    const { start, end } = getTodayRange()

    if (followUp === "today") {
      filter.followUpDate = {
        $gte: start,
        $lt: end,
      }

      if (!followUpStatus) {
        filter.followUpStatus = "Scheduled"
      }
    }

    if (followUp === "overdue") {
      filter.followUpDate = {
        $lt: start,
      }

      if (!followUpStatus) {
        filter.followUpStatus = "Scheduled"
      }
    }

    if (followUp === "upcoming") {
      filter.followUpDate = {
        $gte: end,
      }

      if (!followUpStatus) {
        filter.followUpStatus = "Scheduled"
      }
    }

    if (followUp === "none") {
      andConditions.push({
        $or: [{ followUpDate: null }, { followUpStatus: "Not Set" }],
      })
    }
  }

  if (search?.trim()) {
    const safeSearch = escapeRegex(search.trim())

    andConditions.push({
      $or: [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
        { city: { $regex: safeSearch, $options: "i" } },
        { nationality: { $regex: safeSearch, $options: "i" } },
        { departureCity: { $regex: safeSearch, $options: "i" } },
        { preferredDepartureCity: { $regex: safeSearch, $options: "i" } },
        { destinationCity: { $regex: safeSearch, $options: "i" } },
        { destinationCountry: { $regex: safeSearch, $options: "i" } },
        { destination: { $regex: safeSearch, $options: "i" } },
        { visaType: { $regex: safeSearch, $options: "i" } },
        { packageRequired: { $regex: safeSearch, $options: "i" } },
        { hotelCategory: { $regex: safeSearch, $options: "i" } },
        { preferredHotel: { $regex: safeSearch, $options: "i" } },
        { preferredAirline: { $regex: safeSearch, $options: "i" } },
        { bookingReference: { $regex: safeSearch, $options: "i" } },
        { vehicleType: { $regex: safeSearch, $options: "i" } },
        { rentalType: { $regex: safeSearch, $options: "i" } },
        { pickupLocation: { $regex: safeSearch, $options: "i" } },
        { dropoffLocation: { $regex: safeSearch, $options: "i" } },
        { currentOccupation: { $regex: safeSearch, $options: "i" } },
        { followUpNote: { $regex: safeSearch, $options: "i" } },
        { message: { $regex: safeSearch, $options: "i" } },
        { additionalRequirements: { $regex: safeSearch, $options: "i" } },
        { source: { $regex: safeSearch, $options: "i" } },
      ],
    })
  }

  if (andConditions.length) {
    filter.$and = andConditions
  }

  return filter
}

const buildPaginationMeta = ({ total, page, limit, count, sort }) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = total === 0 ? 0 : from + count - 1

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    from,
    to,
    sort,
  }
}

const populateLeadListQuery = (query) => {
  return query.populate("assignedTo", "name email role")
}

const sendLeadWhatsAppNotificationsIfAvailable = async (lead) => {
  try {
    const whatsappService = await import("../services/whatsapp.service.js")

    if (whatsappService?.sendLeadWhatsAppNotifications) {
      await whatsappService.sendLeadWhatsAppNotifications(lead)
    }
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") {
      console.error("WhatsApp lead notification error:", error.message)
    }
  }
}

export const createLead = asyncHandler(async (req, res) => {
  const { companyWebsite, ...leadData } = req.validated.body

  if (companyWebsite) {
    return res.status(200).json({
      success: true,
      message: "Inquiry submitted successfully.",
    })
  }

  const lead = await Lead.create({
    ...leadData,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
  })

  await createNotification({
    title: "New lead received",
    message: `${lead.name} submitted a new ${lead.serviceType} inquiry.`,
    type: "lead",
    priority: "high",
    relatedModel: "Lead",
    relatedId: lead._id,
    actionUrl: `/admin/leads/${lead._id}`,
  })

  await sendLeadWhatsAppNotificationsIfAvailable(lead)

  res.status(201).json({
    success: true,
    message: "Inquiry submitted successfully.",
    lead: {
      id: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      serviceType: lead.serviceType,
      status: lead.status,
      createdAt: lead.createdAt,
    },
  })
})

export const getLeads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(
    req.validated.query.page,
    req.validated.query.limit
  )

  const sort = getSortValue(req.validated.query.sort)
  const filter = buildLeadFilter(req.validated.query)

  const [leads, total] = await Promise.all([
    populateLeadListQuery(
      Lead.find(filter).sort(sort).skip(skip).limit(limit)
    ).lean(),

    Lead.countDocuments(filter),
  ])

  const pagination = buildPaginationMeta({
    total,
    page,
    limit,
    count: leads.length,
    sort,
  })

  res.status(200).json({
    success: true,

    // Backward-compatible fields for your current frontend
    count: leads.length,
    total,
    page,
    pages: pagination.totalPages,
    leads,

    // New professional pagination object for scalable frontend table
    pagination,

    // Optional structured response for future frontend usage
    data: {
      leads,
      pagination,
    },
  })
})

export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const lead = await Lead.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role")
    .populate("followUpHistory.updatedBy", "name email role")

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  res.status(200).json({
    success: true,
    lead,
  })
})

export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { status } = req.validated.body

  const lead = await Lead.findById(id)

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  if (lead.status !== status) {
    lead.status = status

    lead.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.admin._id,
    })

    await lead.save()
  }

  const updatedLead = await Lead.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role")
    .populate("followUpHistory.updatedBy", "name email role")

  res.status(200).json({
    success: true,
    message: "Lead status updated successfully.",
    lead: updatedLead,
  })
})

export const updateLeadFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { followUpDate, followUpTime, followUpNote, followUpStatus } =
    req.validated.body

  const lead = await Lead.findById(id)

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  if (followUpDate !== undefined) {
    lead.followUpDate = followUpDate
  }

  if (followUpTime !== undefined) {
    lead.followUpTime = followUpTime
  }

  if (followUpNote !== undefined) {
    lead.followUpNote = followUpNote
  }

  if (followUpStatus !== undefined) {
    lead.followUpStatus = followUpStatus
  } else if (followUpDate === null) {
    lead.followUpStatus = "Not Set"
  } else if (followUpDate && lead.followUpStatus === "Not Set") {
    lead.followUpStatus = "Scheduled"
  }

  if (!lead.followUpDate && lead.followUpStatus === "Scheduled") {
    lead.followUpStatus = "Not Set"
  }

  lead.followUpHistory.push({
    followUpDate: lead.followUpDate,
    followUpTime: lead.followUpTime,
    followUpNote: lead.followUpNote,
    followUpStatus: lead.followUpStatus,
    updatedBy: req.admin._id,
    updatedAt: new Date(),
  })

  await lead.save()

  const updatedLead = await Lead.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role")
    .populate("followUpHistory.updatedBy", "name email role")

  res.status(200).json({
    success: true,
    message: "Follow-up updated successfully.",
    lead: updatedLead,
  })
})

export const addLeadNote = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { text } = req.validated.body

  const lead = await Lead.findById(id)

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  lead.notes.push({
    text,
    createdBy: req.admin._id,
    createdAt: new Date(),
  })

  await lead.save()

  const updatedLead = await Lead.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role")
    .populate("followUpHistory.updatedBy", "name email role")

  res.status(201).json({
    success: true,
    message: "Note added successfully.",
    lead: updatedLead,
  })
})

export const assignLead = asyncHandler(async (req, res) => {
  const { id } = req.validated.params
  const { assignedTo } = req.validated.body

  const admin = await Admin.findById(assignedTo)

  if (!admin || !admin.isActive) {
    res.status(404)
    throw new Error("Assigned admin not found or inactive.")
  }

  const lead = await Lead.findByIdAndUpdate(
    id,
    { assignedTo },
    { new: true, runValidators: true }
  ).populate("assignedTo", "name email role")

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  res.status(200).json({
    success: true,
    message: "Lead assigned successfully.",
    lead,
  })
})

export const archiveLead = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const lead = await Lead.findByIdAndUpdate(
    id,
    { isArchived: true },
    { new: true }
  )

  if (!lead) {
    res.status(404)
    throw new Error("Lead not found.")
  }

  res.status(200).json({
    success: true,
    message: "Lead archived successfully.",
    lead,
  })
})
const escapeCsvValue = (value = "") => {
  const stringValue =
    value === undefined || value === null ? "" : String(value)

  return `"${stringValue.replaceAll('"', '""')}"`
}

const formatCsvDate = (date) => {
  if (!date) return ""
  return new Date(date).toLocaleString()
}

const getLeadDestination = (lead = {}) => {
  return (
    lead.destination ||
    lead.destinationCountry ||
    lead.destinationCity ||
    lead.preferredHotel ||
    ""
  )
}

export const exportLeadsCsv = asyncHandler(async (req, res) => {
  const filter = buildLeadFilter(req.validated.query)
  const sort = getSortValue(req.validated.query.sort)

  const leads = await Lead.find(filter)
    .populate("assignedTo", "name email role")
    .sort(sort)
    .lean()

  const columns = [
    "Name",
    "Phone",
    "Email",
    "Service",
    "Status",
    "Priority",
    "Follow-up Status",
    "Follow-up Date",
    "Follow-up Time",
    "Assigned To",
    "City",
    "Destination",
    "Source",
    "Created At",
  ]

  const rows = leads.map((lead) => [
    lead.name || "",
    lead.phone || "",
    lead.email || "",
    lead.serviceType || "",
    lead.status || "",
    lead.priority || "",
    lead.followUpStatus || "Not Set",
    formatCsvDate(lead.followUpDate),
    lead.followUpTime || "",
    lead.assignedTo?.name || "",
    lead.city || "",
    getLeadDestination(lead),
    lead.source || "",
    formatCsvDate(lead.createdAt),
  ])

  const csvContent = [columns, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n")

  const timestamp = new Date().toISOString().slice(0, 10)

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="travelex-leads-${timestamp}.csv"`
  )

  res.status(200).send(csvContent)
})
export const getLeadStats = asyncHandler(async (req, res) => {
  const { start, end } = getTodayRange()

  const [
    totalLeads,
    todayLeads,
    statusStats,
    serviceStats,
    sourceStats,
    priorityStats,
    todayFollowUps,
    overdueFollowUps,
    upcomingFollowUps,
    noFollowUps,
  ] = await Promise.all([
    Lead.countDocuments({ isArchived: false }),

    Lead.countDocuments({
      isArchived: false,
      createdAt: { $gte: start },
    }),

    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
    ]),

    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]),

    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),

    Lead.countDocuments({
      isArchived: false,
      followUpStatus: "Scheduled",
      followUpDate: {
        $gte: start,
        $lt: end,
      },
    }),

    Lead.countDocuments({
      isArchived: false,
      followUpStatus: "Scheduled",
      followUpDate: {
        $lt: start,
      },
    }),

    Lead.countDocuments({
      isArchived: false,
      followUpStatus: "Scheduled",
      followUpDate: {
        $gte: end,
      },
    }),

    Lead.countDocuments({
      isArchived: false,
      $or: [{ followUpDate: null }, { followUpStatus: "Not Set" }],
    }),
  ])

  const formatStats = (items) => {
    return items.reduce((acc, item) => {
      if (item._id) {
        acc[item._id] = item.count
      }

      return acc
    }, {})
  }

  res.status(200).json({
    success: true,
    stats: {
      totalLeads,
      todayLeads,
      byStatus: formatStats(statusStats),
      byServiceType: formatStats(serviceStats),
      bySource: formatStats(sourceStats),
      byPriority: formatStats(priorityStats),
      followUps: {
        today: todayFollowUps,
        overdue: overdueFollowUps,
        upcoming: upcomingFollowUps,
        none: noFollowUps,
      },
    },
  })
})