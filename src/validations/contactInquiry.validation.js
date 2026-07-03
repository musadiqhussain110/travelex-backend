import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const optionalObjectId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  objectIdSchema.optional()
);

const optionalString = (max = 250, defaultValue = "") =>
  z
    .string()
    .trim()
    .max(max, `Cannot exceed ${max} characters`)
    .optional()
    .default(defaultValue);

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional()
);

const statusSchema = z.enum([
  "New",
  "Read",
  "Replied",
  "Closed",
  "Spam"
]);

const sourceSchema = z.enum([
  "contact-page",
  "homepage",
  "footer",
  "support-section",
  "manual",
  "other"
]);

const leadSourceSchema = z
  .object({
    source: optionalString(100, "direct"),
    medium: optionalString(100),
    campaign: optionalString(150),
    content: optionalString(150),
    term: optionalString(150),
    referrer: optionalString(1000),
    landingPage: optionalString(1000),
    landingPath: optionalString(300),
    formPage: optionalString(1000),
    formPath: optionalString(300),
    capturedAt: optionalDate,
    submittedAt: optionalDate
  })
  .optional()
  .default({});

export const createContactInquirySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .toLowerCase(),

    phone: z.string().trim().min(7).max(30),

    subject: z.string().trim().min(3).max(160),

    message: z.string().trim().min(10).max(3000),

    source: sourceSchema.optional().default("contact-page"),

    leadSource: leadSourceSchema,

    pageUrl: z.string().trim().max(500).optional().default(""),

    // Honeypot field for spam bots.
    companyWebsite: z.string().optional().default("")
  })
});

export const getContactInquiriesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),

    limit: z.coerce.number().int().min(1).max(100).optional().default(10),

    search: z.string().trim().optional().default(""),

    status: statusSchema.optional(),

    source: sourceSchema.optional(),

    assignedTo: optionalObjectId,

    includeArchived: z
      .preprocess((value) => value === "true", z.boolean())
      .optional()
      .default(false),

    sort: z
      .enum([
        "-createdAt",
        "createdAt",
        "-updatedAt",
        "updatedAt",
        "status",
        "-status",
        "subject",
        "-subject"
      ])
      .optional()
      .default("-createdAt")
  })
});

export const contactInquiryIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const updateContactInquiryStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z.object({
    status: statusSchema
  })
});

export const addContactInquiryNoteSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z.object({
    text: z.string().trim().min(2).max(2000)
  })
});

export const assignContactInquirySchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),

  body: z.object({
    assignedTo: objectIdSchema
  })
});