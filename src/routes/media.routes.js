import express from "express";

import {
  uploadSingleMedia,
  uploadMultipleMedia,
  deleteMedia
} from "../controllers/media.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  uploadMediaSchema,
  deleteMediaSchema
} from "../validations/media.validation.js";

import {
  uploadSingleImage,
  uploadMultipleImages
} from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superAdmin", "admin"));

router.post(
  "/upload",
  uploadSingleImage("image"),
  validate(uploadMediaSchema),
  uploadSingleMedia
);

router.post(
  "/upload-multiple",
  uploadMultipleImages("images", 10),
  validate(uploadMediaSchema),
  uploadMultipleMedia
);

router.delete(
  "/",
  validate(deleteMediaSchema),
  deleteMedia
);

export default router;