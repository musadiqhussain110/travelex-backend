import slugify from "slugify";

import UmrahPackage from "../models/UmrahPackage.model.js";
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

  let existingPackage = await UmrahPackage.findOne(query);

  while (existingPackage) {
    slug = `${baseSlug}-${counter}`;

    const newQuery = currentId
      ? { slug, _id: { $ne: currentId } }
      : { slug };

    existingPackage = await UmrahPackage.findOne(newQuery);
    counter += 1;
  }

  return slug;
};

const buildPackageFilter = ({
  search,
  status,
  packageType,
  isFeatured,
  publicOnly = false
}) => {
  const filter = {};

  if (publicOnly) {
    filter.status = "published";
  } else if (status) {
    filter.status = status;
  }

  if (packageType) {
    filter.packageType = packageType;
  }

  if (typeof isFeatured === "boolean") {
    filter.isFeatured = isFeatured;
  }

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { shortDescription: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } }
    ];
  }

  return filter;
};

export const createUmrahPackage = asyncHandler(async (req, res) => {
  const packageData = req.validated.body;

  const slugSource = packageData.slug || packageData.title;
  const slug = await generateUniqueSlug(slugSource);

  const umrahPackage = await UmrahPackage.create({
    ...packageData,
    slug,
    createdBy: req.admin._id
  });

  res.status(201).json({
    success: true,
    message: "Umrah package created successfully.",
    package: umrahPackage
  });
});

export const getPublicUmrahPackages = asyncHandler(async (req, res) => {
  const { page, limit, search, packageType, isFeatured, sort } =
    req.validated.query;

  const filter = buildPackageFilter({
    search,
    packageType,
    isFeatured,
    publicOnly: true
  });

  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    UmrahPackage.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-createdBy -updatedBy")
      .lean(),

    UmrahPackage.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: packages.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    packages
  });
});

export const getAdminUmrahPackages = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    status,
    packageType,
    isFeatured,
    sort
  } = req.validated.query;

  const filter = buildPackageFilter({
    search,
    status,
    packageType,
    isFeatured,
    publicOnly: false
  });

  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    UmrahPackage.find(filter)
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    UmrahPackage.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: packages.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    packages
  });
});

export const getPublicUmrahPackageBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.validated.params;

  const umrahPackage = await UmrahPackage.findOne({
    slug,
    status: "published"
  }).select("-createdBy -updatedBy");

  if (!umrahPackage) {
    res.status(404);
    throw new Error("Umrah package not found.");
  }

  res.status(200).json({
    success: true,
    package: umrahPackage
  });
});

export const getAdminUmrahPackageById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const umrahPackage = await UmrahPackage.findById(id)
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!umrahPackage) {
    res.status(404);
    throw new Error("Umrah package not found.");
  }

  res.status(200).json({
    success: true,
    package: umrahPackage
  });
});

export const updateUmrahPackage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const updateData = { ...req.validated.body };

  const existingPackage = await UmrahPackage.findById(id);

  if (!existingPackage) {
    res.status(404);
    throw new Error("Umrah package not found.");
  }

  if (updateData.slug) {
    updateData.slug = await generateUniqueSlug(updateData.slug, id);
  } else if (updateData.title && updateData.title !== existingPackage.title) {
    updateData.slug = await generateUniqueSlug(updateData.title, id);
  }

  updateData.updatedBy = req.admin._id;

  const updatedPackage = await UmrahPackage.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: "Umrah package updated successfully.",
    package: updatedPackage
  });
});

export const archiveUmrahPackage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const umrahPackage = await UmrahPackage.findByIdAndUpdate(
    id,
    {
      status: "archived",
      updatedBy: req.admin._id
    },
    {
      new: true
    }
  );

  if (!umrahPackage) {
    res.status(404);
    throw new Error("Umrah package not found.");
  }

  res.status(200).json({
    success: true,
    message: "Umrah package archived successfully.",
    package: umrahPackage
  });
});