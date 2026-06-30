import { z } from "zod"

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId")

const optionalObjectId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  objectIdSchema.optional()
)

const statusSchema = z.enum(["pending", "sent", "failed", "skipped"])

const purposeSchema = z.enum([
  "admin_lead_alert",
  "customer_confirmation",
  "follow_up",
  "status_update",
  "manual",
])

const directionSchema = z.enum(["outbound", "inbound"])

const providerSchema = z.enum([
  "meta_whatsapp_cloud",
  "manual",
  "disabled",
])

export const getWhatsappLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(20),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    purpose: purposeSchema.optional(),

    direction: directionSchema.optional(),

    provider: providerSchema.optional(),

    lead: optionalObjectId,

    contactInquiry: optionalObjectId,

    sort: z
      .enum([
        "-createdAt",
        "createdAt",
        "-updatedAt",
        "updatedAt",
        "status",
        "-status",
        "purpose",
        "-purpose",
      ])
      .optional()
      .default("-createdAt"),
  }),
})

export const whatsappLogIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
})