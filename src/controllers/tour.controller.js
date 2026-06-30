import slugify from "slugify";

import Tour from "../models/Tour.model.js";
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

  let existingTour = await Tour.findOne(query);

  while (existingTour) {
    slug = `${baseSlug}-${counter}`;

    const newQuery = currentId
      ? { slug, _id: { $ne: currentId } }
      : { slug };

    existingTour = await Tour.findOne(newQuery);
    counter += 1;
  }

  return slug;
};

const buildTourFilter = ({
  search,
  status,
  category,
  destinationType,
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

  if (category) {
    filter.category = category;
  }

  if (destinationType) {
    filter.destinationType = destinationType;
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
      { destination: { $regex: safeSearch, $options: "i" } },
      { country: { $regex: safeSearch, $options: "i" } },
      { city: { $regex: safeSearch, $options: "i" } },
      { shortDescription: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } }
    ];
  }

  return filter;
};

export const createTour = asyncHandler(async (req, res) => {
  const tourData = req.validated.body;

  const slugSource = tourData.slug || tourData.title;
  const slug = await generateUniqueSlug(slugSource);

  const tour = await Tour.create({
    ...tourData,
    slug,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Tour created successfully.",
    tour
  });
});

export const getPublicTours = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    category,
    destinationType,
    country,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildTourFilter({
    search,
    category,
    destinationType,
    country,
    isFeatured,
    publicOnly: true
  });

  const skip = (page - 1) * limit;

  const [tours, total] = await Promise.all([
    Tour.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-createdBy -updatedBy")
      .lean(),

    Tour.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: tours.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    tours
  });
});

export const getAdminTours = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    category,
    destinationType,
    country,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildTourFilter({
    search,
    status,
    category,
    destinationType,
    country,
    isFeatured,
    publicOnly: false
  });

  const skip = (page - 1) * limit;

  const [tours, total] = await Promise.all([
    Tour.find(filter)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Tour.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: tours.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    tours
  });
});

export const getPublicTourBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.validated.params;

  const tour = await Tour.findOne({
    slug,
    status: "published"
  }).select("-createdBy -updatedBy");

  if (!tour) {
    res.status(404);
    throw new Error("Tour not found.");
  }

  res.status(200).json({
    success: true,
    tour
  });
});

export const getAdminTourById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const tour = await Tour.findById(id)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!tour) {
    res.status(404);
    throw new Error("Tour not found.");
  }

  res.status(200).json({
    success: true,
    tour
  });
});

export const updateTour = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = { ...req.validated.body };

  const existingTour = await Tour.findById(id);

  if (!existingTour) {
    res.status(404);
    throw new Error("Tour not found.");
  }

  if (updateData.slug) {
    updateData.slug = await generateUniqueSlug(updateData.slug, id);
  } else if (updateData.title && updateData.title !== existingTour.title) {
    updateData.slug = await generateUniqueSlug(updateData.title, id);
  }

  updateData.updatedBy = req.admin._id;

  const updatedTour = await Tour.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Tour updated successfully.",
    tour: updatedTour
  });
});

export const archiveTour = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const tour = await Tour.findByIdAndUpdate(
    id,
    {
      status: "archived",
      updatedBy: req.admin._id
    },
    {
      new: true
    }
  );

  if (!tour) {
    res.status(404);
    throw new Error("Tour not found.");
  }

  res.status(200).json({
    success: true,
    message: "Tour archived successfully.",
    tour
  });
});