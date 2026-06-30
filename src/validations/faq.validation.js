import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const statusSchema = z.enum(["draft", "published", "archived"]);

const pageTypeSchema = z.enum([
  "homepage",
  "umrah",
  "tour",
  "visa",
  "contact",
  "general"
]);

export const createFaqSchema = z.object({
  body: z.object({
    question: z.string().trim().min(5).max(250),

    slug: z.string().trim().min(3).max(220).optional(),

    answer: z.string().trim().min(10).max(3000),

    pageType: pageTypeSchema.optional().default("general"),

    category: z.string().trim().max(100).optional().default("General"),

    order: z.coerce.number().int().min(0).optional().default(0),

    isFeatured: z.boolean().optional().default(false),

    status: statusSchema.optional().default("draft"),

    metaTitle: z.string().trim().max(160).optional().default(""),

    metaDescription: z.string().trim().max(300).optional().default("")
  })
});

export const updateFaqSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z
    .object({
      question: z.string().trim().min(5).max(250).optional(),

      slug: z.string().trim().min(3).max(220).optional(),

      answer: z.string().trim().min(10).max(3000).optional(),

      pageType: pageTypeSchema.optional(),

      category: z.string().trim().max(100).optional(),

      order: z.coerce.number().int().min(0).optional(),

      isFeatured: z.boolean().optional(),

      status: statusSchema.optional(),

      metaTitle: z.string().trim().max(160).optional(),

      metaDescription: z.string().trim().max(300).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update"
    })
});

export const getFaqsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    pageType: pageTypeSchema.optional(),

    category: z.string().trim().optional(),

    isFeatured: z
      .preprocess((value) => {
        if (value === undefined || value === "") return undefined;
        return value === "true" || value === true;
      }, z.boolean().optional())
      .optional(),

    sort: z
      .enum([
        "order",
        "-order",
        "-createdAt",
        "createdAt",
        "-updatedAt",
        "updatedAt",
        "question",
        "-question"
      ])
      .optional()
      .default("order")
  })
});

export const faqIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const faqSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  })
});