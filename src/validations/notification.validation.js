import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const typeSchema = z.enum([
  "lead",
  "contact-inquiry",
  "umrah-package",
  "tour",
  "visa-service",
  "blog",
  "faq",
  "media",
  "system"
]);

const prioritySchema = z.enum([
  "low",
  "normal",
  "high"
]);

const relatedModelSchema = z.enum([
  "Lead",
  "ContactInquiry",
  "UmrahPackage",
  "Tour",
  "VisaService",
  "Blog",
  "Faq",
  "None"
]);

export const createManualNotificationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),

    message: z.string().trim().min(5).max(1000),

    type: typeSchema.optional().default("system"),

    priority: prioritySchema.optional().default("normal"),

    relatedModel: relatedModelSchema.optional().default("None"),

    relatedId: objectIdSchema.optional(),

    actionUrl: z.string().trim().optional().default("")
  })
});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(20),

    search: z.string().trim().optional().default(""),

    type: typeSchema.optional(),

    priority: prioritySchema.optional(),

    readStatus: z
      .enum(["all", "read", "unread"])
      .optional()
      .default("all"),

    sort: z
      .enum(["-createdAt", "createdAt", "priority", "-priority"])
      .optional()
      .default("-createdAt")
  })
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});