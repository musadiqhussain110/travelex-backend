import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const statusSchema = z.enum(["draft", "published", "archived"]);

const visaTypeSchema = z.enum([
  "tourist",
  "visit",
  "business",
  "student",
  "work",
  "family",
  "transit",
  "other"
]);

const imageSchema = z.object({
  imageUrl: z.string().trim().optional().default(""),
  publicId: z.string().trim().optional().default("")
});

const processStepSchema = z.object({
  step: z.coerce.number().int().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().optional().default("")
});

export const createVisaServiceSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),

    slug: z.string().trim().min(3).max(180).optional(),

    country: z.string().trim().min(2).max(120),

    visaType: visaTypeSchema.optional().default("tourist"),

    shortDescription: z.string().trim().max(300).optional().default(""),

    description: z.string().trim().max(5000).optional().default(""),

    priceFrom: z.coerce.number().min(0),

    currency: z.string().trim().optional().default("PKR"),

    processingTime: z.string().trim().optional().default(""),

    validity: z.string().trim().optional().default(""),

    stayDuration: z.string().trim().optional().default(""),

    requirements: z.array(z.string().trim().min(1)).optional().default([]),

    documentsRequired: z.array(z.string().trim().min(1)).optional().default([]),

    processSteps: z.array(processStepSchema).optional().default([]),

    importantNotes: z.array(z.string().trim().min(1)).optional().default([]),

    image: imageSchema.optional(),

    gallery: z.array(imageSchema).optional().default([]),

    isFeatured: z.boolean().optional().default(false),

    status: statusSchema.optional().default("draft"),

    metaTitle: z.string().trim().max(160).optional().default(""),

    metaDescription: z.string().trim().max(300).optional().default("")
  })
});

export const updateVisaServiceSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),

      slug: z.string().trim().min(3).max(180).optional(),

      country: z.string().trim().min(2).max(120).optional(),

      visaType: visaTypeSchema.optional(),

      shortDescription: z.string().trim().max(300).optional(),

      description: z.string().trim().max(5000).optional(),

      priceFrom: z.coerce.number().min(0).optional(),

      currency: z.string().trim().optional(),

      processingTime: z.string().trim().optional(),

      validity: z.string().trim().optional(),

      stayDuration: z.string().trim().optional(),

      requirements: z.array(z.string().trim().min(1)).optional(),

      documentsRequired: z.array(z.string().trim().min(1)).optional(),

      processSteps: z.array(processStepSchema).optional(),

      importantNotes: z.array(z.string().trim().min(1)).optional(),

      image: imageSchema.optional(),

      gallery: z.array(imageSchema).optional(),

      isFeatured: z.boolean().optional(),

      status: statusSchema.optional(),

      metaTitle: z.string().trim().max(160).optional(),

      metaDescription: z.string().trim().max(300).optional()
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update"
    })
});

export const getVisaServicesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    visaType: visaTypeSchema.optional(),

    country: z.string().trim().optional(),

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
        "priceFrom",
        "-priceFrom",
        "title",
        "-title"
      ])
      .optional()
      .default("-createdAt")
  })
});

export const visaServiceIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const visaServiceSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  })
});