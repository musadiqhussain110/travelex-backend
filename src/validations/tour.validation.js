import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const statusSchema = z.enum(["draft", "published", "archived"]);

const categorySchema = z.enum([
  "family",
  "honeymoon",
  "adventure",
  "luxury",
  "cultural",
  "group",
  "customized",
  "other"
]);

const destinationTypeSchema = z.enum(["international", "domestic"]);

const imageSchema = z.object({
  imageUrl: z.string().trim().optional().default(""),
  publicId: z.string().trim().optional().default("")
});

const itineraryDaySchema = z.object({
  day: z.coerce.number().int().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().optional().default("")
});

export const createTourSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),

    slug: z.string().trim().min(3).max(180).optional(),

    destination: z.string().trim().min(2).max(120),

    country: z.string().trim().min(2).max(120),

    city: z.string().trim().optional().default(""),

    destinationType: destinationTypeSchema.optional().default("international"),

    category: categorySchema.optional().default("family"),

    shortDescription: z.string().trim().max(300).optional().default(""),

    description: z.string().trim().max(5000).optional().default(""),

    durationDays: z.coerce.number().int().min(1),

    nights: z.coerce.number().int().min(0),

    priceFrom: z.coerce.number().min(0),

    currency: z.string().trim().optional().default("PKR"),

    departureCity: z.string().trim().optional().default(""),

    isCustomizable: z.boolean().optional().default(true),

    highlights: z.array(z.string().trim().min(1)).optional().default([]),

    inclusions: z.array(z.string().trim().min(1)).optional().default([]),

    exclusions: z.array(z.string().trim().min(1)).optional().default([]),

    itinerary: z.array(itineraryDaySchema).optional().default([]),

    image: imageSchema.optional(),

    gallery: z.array(imageSchema).optional().default([]),

    isFeatured: z.boolean().optional().default(false),

    status: statusSchema.optional().default("draft"),

    metaTitle: z.string().trim().max(160).optional().default(""),

    metaDescription: z.string().trim().max(300).optional().default("")
  })
});

export const updateTourSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),

      slug: z.string().trim().min(3).max(180).optional(),

      destination: z.string().trim().min(2).max(120).optional(),

      country: z.string().trim().min(2).max(120).optional(),

      city: z.string().trim().optional(),

      destinationType: destinationTypeSchema.optional(),

      category: categorySchema.optional(),

      shortDescription: z.string().trim().max(300).optional(),

      description: z.string().trim().max(5000).optional(),

      durationDays: z.coerce.number().int().min(1).optional(),

      nights: z.coerce.number().int().min(0).optional(),

      priceFrom: z.coerce.number().min(0).optional(),

      currency: z.string().trim().optional(),

      departureCity: z.string().trim().optional(),

      isCustomizable: z.boolean().optional(),

      highlights: z.array(z.string().trim().min(1)).optional(),

      inclusions: z.array(z.string().trim().min(1)).optional(),

      exclusions: z.array(z.string().trim().min(1)).optional(),

      itinerary: z.array(itineraryDaySchema).optional(),

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

export const getToursQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    category: categorySchema.optional(),

    destinationType: destinationTypeSchema.optional(),

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
        "durationDays",
        "-durationDays",
        "title",
        "-title"
      ])
      .optional()
      .default("-createdAt")
  })
});

export const tourIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const tourSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  })
});