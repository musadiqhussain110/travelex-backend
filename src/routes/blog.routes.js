import express from "express";

import {
  createBlog,
  getPublicBlogs,
  getAdminBlogs,
  getPublicBlogBySlug,
  getAdminBlogById,
  updateBlog,
  archiveBlog
} from "../controllers/blog.controller.js";

import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createBlogSchema,
  updateBlogSchema,
  getBlogsQuerySchema,
  blogIdParamSchema,
  blogSlugParamSchema
} from "../validations/blog.validation.js";

const router = express.Router();

// Public routes
router.get("/", validate(getBlogsQuerySchema), getPublicBlogs);

// Admin routes
router.get(
  "/admin/all",
  protect,
  validate(getBlogsQuerySchema),
  getAdminBlogs
);

router.get(
  "/admin/:id",
  protect,
  validate(blogIdParamSchema),
  getAdminBlogById
);

router.post(
  "/",
  protect,
  authorize("superAdmin", "admin"),
  validate(createBlogSchema),
  createBlog
);

router.patch(
  "/:id",
  protect,
  authorize("superAdmin", "admin"),
  validate(updateBlogSchema),
  updateBlog
);

router.patch(
  "/:id/archive",
  protect,
  authorize("superAdmin", "admin"),
  validate(blogIdParamSchema),
  archiveBlog
);

// Public slug route should stay at bottom
router.get(
  "/:slug",
  validate(blogSlugParamSchema),
  getPublicBlogBySlug
);

export default router;