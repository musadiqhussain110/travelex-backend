import slugify from "slugify";

import VisaService from "../models/VisaService.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const createSlug = (value) => {
  return slugify(value, {
    lower: true,
    strict: true,
    trim: true
  });
};

const generateUniqueSlug = async (value, currentId = null) => {
  const baseSlug = createSlug(value);
  let slug = baseSlug;
  let counter = 1;

  const query = currentId
    ? { slug, _id: { $ne: currentId } }
    : { slug };

  let existingVisaService = await VisaService.findOne(query);

  while (existingVisaService) {
    slug = `${baseSlug}-${counter}`;

    const newQuery = currentId
      ? { slug, _id: { $ne: currentId } }
      : { slug };

    existingVisaService = await VisaService.findOne(newQuery);
    counter += 1;
  }

  return slug;
};

const buildVisaServiceFilter = ({
  search,
  status,
  visaType,
  country,
  isFeatured,
  publicOnly = false
}) => {
  const filter = {};

  if (publicOnly) {
    filter.status = "published";
  } else if (status) {
    filter.status = status;
  }

  if (visaType) {
    filter.visaType = visaType;
  }

  if (country) {
    filter.country = { $regex: escapeRegex(country), $options: "i" };
  }

  if (typeof isFeatured === "boolean") {
    filter.isFeatured = isFeatured;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { country: { $regex: safeSearch, $options: "i" } },
      { shortDescription: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } }
    ];
  }

  return filter;
};

export const createVisaService = asyncHandler(async (req, res) => {
  const visaServiceData = req.validated.body;

  const slugSource = visaServiceData.slug || visaServiceData.title;
  const slug = await generateUniqueSlug(slugSource);

  const visaService = await VisaService.create({
    ...visaServiceData,
    slug,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Visa service created successfully.",
    visaService
  });
});

export const getPublicVisaServices = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    visaType,
    country,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildVisaServiceFilter({
    search,
    visaType,
    country,
    isFeatured,
    publicOnly: true
  });

  const skip = (page - 1) * limit;

  const [visaServices, total] = await Promise.all([
    VisaService.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-createdBy -updatedBy")
      .lean(),

    VisaService.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: visaServices.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    visaServices
  });
});

export const getAdminVisaServices = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    visaType,
    country,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildVisaServiceFilter({
    search,
    status,
    visaType,
    country,
    isFeatured,
    publicOnly: false
  });

  const skip = (page - 1) * limit;

  const [visaServices, total] = await Promise.all([
    VisaService.find(filter)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    VisaService.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: visaServices.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    visaServices
  });
});

export const getPublicVisaServiceBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.validated.params;

  const visaService = await VisaService.findOne({
    slug,
    status: "published"
  }).select("-createdBy -updatedBy");

  if (!visaService) {
    res.status(404);
    throw new Error("Visa service not found.");
  }

  res.status(200).json({
    success: true,
    visaService
  });
});

export const getAdminVisaServiceById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const visaService = await VisaService.findById(id)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!visaService) {
    res.status(404);
    throw new Error("Visa service not found.");
  }

  res.status(200).json({
    success: true,
    visaService
  });
});

export const updateVisaService = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = { ...req.validated.body };

  const existingVisaService = await VisaService.findById(id);

  if (!existingVisaService) {
    res.status(404);
    throw new Error("Visa service not found.");
  }

  if (updateData.slug) {
    updateData.slug = await generateUniqueSlug(updateData.slug, id);
  } else if (
    updateData.title &&
    updateData.title !== existingVisaService.title
  ) {
    updateData.slug = await generateUniqueSlug(updateData.title, id);
  }

  updateData.updatedBy = req.admin._id;

  const updatedVisaService = await VisaService.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: "Visa service updated successfully.",
    visaService: updatedVisaService
  });
});

export const archiveVisaService = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const visaService = await VisaService.findByIdAndUpdate(
    id,
    {
      status: "archived",
      updatedBy: req.admin._id
    },
    {
      new: true
    }
  );

  if (!visaService) {
    res.status(404);
    throw new Error("Visa service not found.");
  }

  res.status(200).json({
    success: true,
    message: "Visa service archived successfully.",
    visaService
  });
});