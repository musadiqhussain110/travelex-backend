import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const statusSchema = z.enum(["draft", "published", "archived"]);

const packageTypeSchema = z.enum([
  "economy",
  "standard",
  "premium",
  "vip"
]);

const hotelCategorySchema = z.enum([
  "3-star",
  "4-star",
  "5-star",
  "custom"
]);

const imageSchema = z.object({
  imageUrl: z.string().trim().optional().default(""),
  publicId: z.string().trim().optional().default("")
});

const hotelSchema = z.object({
  name: z.string().trim().optional().default(""),
  rating: z.string().trim().optional().default(""),
  distance: z.string().trim().optional().default("")
});

const itineraryDaySchema = z.object({
  day: z.coerce.number().int().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().optional().default("")
});

export const createUmrahPackageSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),

    slug: z.string().trim().min(3).max(180).optional(),

    shortDescription: z.string().trim().max(300).optional().default(""),

    description: z.string().trim().max(5000).optional().default(""),

    durationDays: z.coerce.number().int().min(1),

    makkahNights: z.coerce.number().int().min(0),

    madinahNights: z.coerce.number().int().min(0),

    packageType: packageTypeSchema.optional().default("standard"),

    hotelCategory: hotelCategorySchema.optional().default("3-star"),

    priceFrom: z.coerce.number().min(0),

    currency: z.string().trim().optional().default("PKR"),

    departureCity: z.string().trim().optional().default(""),

    airline: z.string().trim().optional().default(""),

    hotels: z
      .object({
        makkah: hotelSchema.optional(),
        madinah: hotelSchema.optional()
      })
      .optional(),

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

export const updateUmrahPackageSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z
    .object({
      title: z.string().trim().min(3).max(160).optional(),

      slug: z.string().trim().min(3).max(180).optional(),

      shortDescription: z.string().trim().max(300).optional(),

      description: z.string().trim().max(5000).optional(),

      durationDays: z.coerce.number().int().min(1).optional(),

      makkahNights: z.coerce.number().int().min(0).optional(),

      madinahNights: z.coerce.number().int().min(0).optional(),

      packageType: packageTypeSchema.optional(),

      hotelCategory: hotelCategorySchema.optional(),

      priceFrom: z.coerce.number().min(0).optional(),

      currency: z.string().trim().optional(),

      departureCity: z.string().trim().optional(),

      airline: z.string().trim().optional(),

      hotels: z
        .object({
          makkah: hotelSchema.optional(),
          madinah: hotelSchema.optional()
        })
        .optional(),

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

export const getUmrahPackagesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    packageType: packageTypeSchema.optional(),

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

export const umrahPackageIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const umrahPackageSlugParamSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
  })
});