import slugify from "slugify";

import Blog from "../models/Blog.model.js";
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

  let existingBlog = await Blog.findOne(query);

  while (existingBlog) {
    slug = `${baseSlug}-${counter}`;

    const newQuery = currentId
      ? { slug, _id: { $ne: currentId } }
      : { slug };

    existingBlog = await Blog.findOne(newQuery);
    counter += 1;
  }

  return slug;
};

const buildBlogFilter = ({
  search,
  status,
  category,
  tag,
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
    filter.category = { $regex: escapeRegex(category), $options: "i" };
  }

  if (tag) {
    filter.tags = { $regex: escapeRegex(tag), $options: "i" };
  }

  if (typeof isFeatured === "boolean") {
    filter.isFeatured = isFeatured;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { excerpt: { $regex: safeSearch, $options: "i" } },
      { content: { $regex: safeSearch, $options: "i" } },
      { category: { $regex: safeSearch, $options: "i" } },
      { tags: { $regex: safeSearch, $options: "i" } }
    ];
  }

  return filter;
};

export const createBlog = asyncHandler(async (req, res) => {
  const blogData = req.validated.body;

  const slugSource = blogData.slug || blogData.title;
  const slug = await generateUniqueSlug(slugSource);

  if (blogData.status === "published" && !blogData.publishedAt) {
    blogData.publishedAt = new Date();
  }

  const blog = await Blog.create({
    ...blogData,
    slug,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Blog created successfully.",
    blog
  });
});

export const getPublicBlogs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    category,
    tag,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildBlogFilter({
    search,
    category,
    tag,
    isFeatured,
    publicOnly: true
  });

  const skip = (page - 1) * limit;

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-createdBy -updatedBy")
      .lean(),

    Blog.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    blogs
  });
});

export const getAdminBlogs = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    category,
    tag,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildBlogFilter({
    search,
    status,
    category,
    tag,
    isFeatured,
    publicOnly: false
  });

  const skip = (page - 1) * limit;

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Blog.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: blogs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    blogs
  });
});

export const getPublicBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.validated.params;

  const blog = await Blog.findOne({
    slug,
    status: "published"
  }).select("-createdBy -updatedBy");

  if (!blog) {
    res.status(404);
    throw new Error("Blog not found.");
  }

  res.status(200).json({
    success: true,
    blog
  });
});

export const getAdminBlogById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const blog = await Blog.findById(id)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!blog) {
    res.status(404);
    throw new Error("Blog not found.");
  }

  res.status(200).json({
    success: true,
    blog
  });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = { ...req.validated.body };

  const existingBlog = await Blog.findById(id);

  if (!existingBlog) {
    res.status(404);
    throw new Error("Blog not found.");
  }

  if (updateData.slug) {
    updateData.slug = await generateUniqueSlug(updateData.slug, id);
  } else if (updateData.title && updateData.title !== existingBlog.title) {
    updateData.slug = await generateUniqueSlug(updateData.title, id);
  }

  if (
    updateData.status === "published" &&
    !existingBlog.publishedAt &&
    !updateData.publishedAt
  ) {
    updateData.publishedAt = new Date();
  }

  updateData.updatedBy = req.admin._id;

  const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: "Blog updated successfully.",
    blog: updatedBlog
  });
});

export const archiveBlog = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const blog = await Blog.findByIdAndUpdate(
    id,
    {
      status: "archived",
      updatedBy: req.admin._id
    },
    {
      new: true
    }
  );

  if (!blog) {
    res.status(404);
    throw new Error("Blog not found.");
  }

  res.status(200).json({
    success: true,
    message: "Blog archived successfully.",
    blog
  });
});