import slugify from "slugify";

import Faq from "../models/Faq.model.js";
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

  let existingFaq = await Faq.findOne(query);

  while (existingFaq) {
    slug = `${baseSlug}-${counter}`;

    const newQuery = currentId
      ? { slug, _id: { $ne: currentId } }
      : { slug };

    existingFaq = await Faq.findOne(newQuery);
    counter += 1;
  }

  return slug;
};

const buildFaqFilter = ({
  search,
  status,
  pageType,
  category,
  isFeatured,
  publicOnly = false
}) => {
  const filter = {};

  if (publicOnly) {
    filter.status = "published";
  } else if (status) {
    filter.status = status;
  }

  if (pageType) {
    filter.pageType = pageType;
  }

  if (category) {
    filter.category = { $regex: escapeRegex(category), $options: "i" };
  }

  if (typeof isFeatured === "boolean") {
    filter.isFeatured = isFeatured;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { question: { $regex: safeSearch, $options: "i" } },
      { answer: { $regex: safeSearch, $options: "i" } },
      { category: { $regex: safeSearch, $options: "i" } }
    ];
  }

  return filter;
};

export const createFaq = asyncHandler(async (req, res) => {
  const faqData = req.validated.body;

  const slugSource = faqData.slug || faqData.question;
  const slug = await generateUniqueSlug(slugSource);

  const faq = await Faq.create({
    ...faqData,
    slug,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "FAQ created successfully.",
    faq
  });
});

export const getPublicFaqs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    pageType,
    category,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildFaqFilter({
    search,
    pageType,
    category,
    isFeatured,
    publicOnly: true
  });

  const skip = (page - 1) * limit;

  const [faqs, total] = await Promise.all([
    Faq.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-createdBy -updatedBy")
      .lean(),

    Faq.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: faqs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    faqs
  });
});

export const getAdminFaqs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    pageType,
    category,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildFaqFilter({
    search,
    status,
    pageType,
    category,
    isFeatured,
    publicOnly: false
  });

  const skip = (page - 1) * limit;

  const [faqs, total] = await Promise.all([
    Faq.find(filter)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Faq.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: faqs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    faqs
  });
});

export const getPublicFaqBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.validated.params;

  const faq = await Faq.findOne({
    slug,
    status: "published"
  }).select("-createdBy -updatedBy");

  if (!faq) {
    res.status(404);
    throw new Error("FAQ not found.");
  }

  res.status(200).json({
    success: true,
    faq
  });
});

export const getAdminFaqById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const faq = await Faq.findById(id)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!faq) {
    res.status(404);
    throw new Error("FAQ not found.");
  }

  res.status(200).json({
    success: true,
    faq
  });
});

export const updateFaq = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = { ...req.validated.body };

  const existingFaq = await Faq.findById(id);

  if (!existingFaq) {
    res.status(404);
    throw new Error("FAQ not found.");
  }

  if (updateData.slug) {
    updateData.slug = await generateUniqueSlug(updateData.slug, id);
  } else if (
    updateData.question &&
    updateData.question !== existingFaq.question
  ) {
    updateData.slug = await generateUniqueSlug(updateData.question, id);
  }

  updateData.updatedBy = req.admin._id;

  const updatedFaq = await Faq.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "FAQ updated successfully.",
    faq: updatedFaq
  });
});

export const archiveFaq = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const faq = await Faq.findByIdAndUpdate(
    id,
    {
      status: "archived",
      updatedBy: req.admin._id
    },
    {
      new: true
    }
  );

  if (!faq) {
    res.status(404);
    throw new Error("FAQ not found.");
  }

  res.status(200).json({
    success: true,
    message: "FAQ archived successfully.",
    faq
  });
});