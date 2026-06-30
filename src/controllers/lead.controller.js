import Lead from "../models/Lead.model.js"
import Admin from "../models/Admin.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { createNotification } from "../services/notification.service.js"

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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
  if (req.body.companyWebsite) {
  res.status(400)
  throw new Error("Invalid request.")
}
  const { companyWebsite, ...leadData } = req.validated.body

  // Honeypot spam protection.
  // If bot fills hidden field, silently accept but do not save.
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
  const {
    page,
    limit,
    search,
    status,
    serviceType,
    source,
    priority,
    assignedTo,
    includeArchived,
    sort,
  } = req.validated.query

  const filter = {}

  if (!includeArchived) {
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

  if (assignedTo) {
    filter.assignedTo = assignedTo
  }

  if (search) {
    const safeSearch = escapeRegex(search)

    filter.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } },
      { city: { $regex: safeSearch, $options: "i" } },
      { nationality: { $regex: safeSearch, $options: "i" } },
      { departureCity: { $regex: safeSearch, $options: "i" } },
      { destinationCity: { $regex: safeSearch, $options: "i" } },
      { destinationCountry: { $regex: safeSearch, $options: "i" } },
      { destination: { $regex: safeSearch, $options: "i" } },
      { visaType: { $regex: safeSearch, $options: "i" } },
      { preferredAirline: { $regex: safeSearch, $options: "i" } },
      { currentOccupation: { $regex: safeSearch, $options: "i" } },
      { message: { $regex: safeSearch, $options: "i" } },
      { additionalRequirements: { $regex: safeSearch, $options: "i" } },
    ]
  }

  const skip = (page - 1) * limit

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Lead.countDocuments(filter),
  ])

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    leads,
  })
})

export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params

  const lead = await Lead.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role")

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

  res.status(200).json({
    success: true,
    message: "Lead status updated successfully.",
    lead,
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

  const updatedLead = await Lead.findById(id).populate(
    "notes.createdBy",
    "name email role"
  )

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

export const getLeadStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalLeads,
    todayLeads,
    statusStats,
    serviceStats,
    sourceStats,
    priorityStats,
  ] = await Promise.all([
    Lead.countDocuments({ isArchived: false }),

    Lead.countDocuments({
      isArchived: false,
      createdAt: { $gte: today },
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
      totalLeads,
      todayLeads,
      byStatus: formatStats(statusStats),
      byServiceType: formatStats(serviceStats),
      bySource: formatStats(sourceStats),
      byPriority: formatStats(priorityStats),
    },
  })
})
