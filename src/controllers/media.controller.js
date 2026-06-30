import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary
} from "../services/cloudinary.service.js";

const getCloudinaryFolder = (folder) => {
  return `travelex/${folder}`;
};

const formatCloudinaryResponse = (result) => {
  return {
    imageUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes
  };
};

export const uploadSingleMedia = asyncHandler(async (req, res) => {
  const { folder } = req.validated.body;

  if (!req.file) {
    res.status(400);
    throw new Error("Image file is required.");
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: getCloudinaryFolder(folder)
  });

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully.",
    media: formatCloudinaryResponse(result)
  });
});

export const uploadMultipleMedia = asyncHandler(async (req, res) => {
  const { folder } = req.validated.body;

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("At least one image file is required.");
  }

  const uploadPromises = req.files.map((file) =>
    uploadBufferToCloudinary(file.buffer, {
      folder: getCloudinaryFolder(folder)
    })
  );

  const results = await Promise.all(uploadPromises);

  res.status(201).json({
    success: true,
    message: "Images uploaded successfully.",
    media: results.map(formatCloudinaryResponse)
  });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { publicId } = req.validated.body;

  const result = await deleteFromCloudinary(publicId);

  res.status(200).json({
    success: true,
    message: "Image deleted successfully.",
    result
  });
});