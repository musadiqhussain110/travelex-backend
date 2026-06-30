import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const statusSchema = z.enum(["draft", "published", "archived"]);

const imageSchema = z.object({
  imageUrl: z.string().trim().optional().default(""),
  publicId: z.string().trim().optional().default("")
});

export const createBlogSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(180),

    slug: z.string().trim().min(3).max(200).optional(),

    excerpt: z.string().trim().min(20).max(350),

    content: z.string().trim().min(50),

    category: z.string().trim().min(2).max(80),

    tags: z.array(z.string().trim().min(1).max(50)).optional().default([]),

    coverImage: imageSchema.optional(),

    authorName: z.string().trim().max(100).optional().default("TravelEx Team"),

    isFeatured: z.boolean().optional().default(false),

    status: statusSchema.optional().default("draft"),

    publishedAt: z.coerce.date().optional(),

    metaTitle: z.string().trim().max(160).optional().default(""),

    metaDescription: z.string().trim().max(300).optional().default("")
  })
});

export const updateBlogSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z
    .object({
      title: z.string().trim().min(3).max(180).optional(),

      slug: z.string().trim().min(3).max(200).optional(),

      excerpt: z.string().trim().min(20).max(350).optional(),

      content: z.string().trim().min(50).optional(),

      category: z.string().trim().min(2).max(80).optional(),

      tags: z.array(z.string().trim().min(1).max(50)).optional(),

      coverImage: imageSchema.optional(),

      authorName: z.string().trim().max(100).optional(),

      isFeatured: z.boolean().optional(),

      status: statusSchema.optional(),

      publishedAt: z.coerce.date().optional(),

      metaTitle: z.string().trim().max(160).optional(),

      metaDescription: z.string().trim().max(300).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update"
    })
});

export const getBlogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    category: z.string().trim().optional(),

    tag: z.string().trim().optional(),

    isFeatured: z
      .preprocess((value) => {
        if (value === undefined || value === "") return undefined;
        return value === "true" || value === true;
      }, z.boolean().optional())
      .optional(),

    sort: z
      .enum([
        "-createdAt",
        "createdAt",
        "-updatedAt",
        "updatedAt",
        "-publishedAt",
        "publishedAt",
        "title",
        "-title"
      ])
      .optional()
      .default("-publishedAt")
  })
});

export const blogIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const blogSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  })
});