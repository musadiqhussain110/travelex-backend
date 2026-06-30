import ContactInquiry from "../models/ContactInquiry.model.js";
import Admin from "../models/Admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createNotification } from "../services/notification.service.js"
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const createContactInquiry = asyncHandler(async (req, res) => {
  const { companyWebsite, ...inquiryData } = req.validated.body;

  // Honeypot spam protection.
  // If bot fills hidden field, silently return success but do not save.
  if (companyWebsite) {
    return res.status(200).json({
      success: true,
      message: "Your message has been submitted successfully."
    });
  }

  const inquiry = await ContactInquiry.create({
    ...inquiryData,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || ""
  });
await createNotification({
  title: "New contact inquiry received",
  message: `${inquiry.name} submitted a contact inquiry: ${inquiry.subject}`,
  type: "contact-inquiry",
  priority: "normal",
  relatedModel: "ContactInquiry",
  relatedId: inquiry._id,
  actionUrl: `/admin/contact-inquiries/${inquiry._id}`
});
  res.status(201).json({
    success: true,
    message: "Your message has been submitted successfully.",
    inquiry: {
      id: inquiry._id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      subject: inquiry.subject,
      status: inquiry.status,
      createdAt: inquiry.createdAt
    }
  });
});

export const getContactInquiries = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    source,
    assignedTo,
    includeArchived,
    sort
  } = req.validated.query;

  const filter = {};

  if (!includeArchived) {
    filter.isArchived = false;
  }

  if (status) {
    filter.status = status;
  }

  if (source) {
    filter.source = source;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } },
      { subject: { $regex: safeSearch, $options: "i" } },
      { message: { $regex: safeSearch, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [inquiries, total] = await Promise.all([
    ContactInquiry.find(filter)
      .populate("assignedTo", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    ContactInquiry.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: inquiries.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    inquiries
  });
});

export const getContactInquiryById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const inquiry = await ContactInquiry.findById(id)
    .populate("assignedTo", "name email role")
    .populate("notes.createdBy", "name email role")
    .populate("statusHistory.changedBy", "name email role");

  if (!inquiry) {
    res.status(404);
    throw new Error("Contact inquiry not found.");
  }

  res.status(200).json({
    success: true,
    inquiry
  });
});

export const updateContactInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const inquiry = await ContactInquiry.findById(id);

  if (!inquiry) {
    res.status(404);
    throw new Error("Contact inquiry not found.");
  }

  if (inquiry.status !== status) {
    inquiry.status = status;

    inquiry.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.admin._id
    });

    await inquiry.save();
  }

  res.status(200).json({
    success: true,
    message: "Contact inquiry status updated successfully.",
    inquiry
  });
});

export const addContactInquiryNote = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { text } = req.validated.body;

  const inquiry = await ContactInquiry.findById(id);

  if (!inquiry) {
    res.status(404);
    throw new Error("Contact inquiry not found.");
  }

  inquiry.notes.push({
    text,
    createdBy: req.admin._id,
    createdAt: new Date()
  });

  await inquiry.save();

  const updatedInquiry = await ContactInquiry.findById(id).populate(
    "notes.createdBy",
    "name email role"
  );

  res.status(201).json({
    success: true,
    message: "Note added successfully.",
    inquiry: updatedInquiry
  });
});

export const assignContactInquiry = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { assignedTo } = req.validated.body;

  const admin = await Admin.findById(assignedTo);

  if (!admin || !admin.isActive) {
    res.status(404);
    throw new Error("Assigned admin not found or inactive.");
  }

  const inquiry = await ContactInquiry.findByIdAndUpdate(
    id,
    { assignedTo },
    { new: true, runValidators: true }
  ).populate("assignedTo", "name email role");

  if (!inquiry) {
    res.status(404);
    throw new Error("Contact inquiry not found.");
  }

  res.status(200).json({
    success: true,
    message: "Contact inquiry assigned successfully.",
    inquiry
  });
});

export const archiveContactInquiry = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const inquiry = await ContactInquiry.findByIdAndUpdate(
    id,
    { isArchived: true },
    { new: true }
  );

  if (!inquiry) {
    res.status(404);
    throw new Error("Contact inquiry not found.");
  }

  res.status(200).json({
    success: true,
    message: "Contact inquiry archived successfully.",
    inquiry
  });
});

export const getContactInquiryStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalInquiries,
    todayInquiries,
    statusStats,
    sourceStats
  ] = await Promise.all([
    ContactInquiry.countDocuments({ isArchived: false }),

    ContactInquiry.countDocuments({
      isArchived: false,
      createdAt: { $gte: today }
    }),

    ContactInquiry.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),

    ContactInquiry.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ])
  ]);

  const formatStats = (items) => {
    return items.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  };

  res.status(200).json({
    success: true,
    stats: {
      totalInquiries,
      todayInquiries,
      byStatus: formatStats(statusStats),
      bySource: formatStats(sourceStats)
    }
  });
});