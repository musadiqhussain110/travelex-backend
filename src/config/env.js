import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const booleanFromString = (defaultValue = false) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return defaultValue
    }

    if (typeof value === "boolean") {
      return value
    }

    return String(value).toLowerCase() === "true"
  }, z.boolean())

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    PORT: z.coerce.number().default(5000),

    MONGO_URI: z.string().min(1, "MONGO_URI is required"),

    JWT_SECRET: z
      .string()
      .min(20, "JWT_SECRET must be at least 20 characters"),

    JWT_EXPIRES_IN: z.string().default("7d"),

    CLIENT_URL: z
      .string()
      .url("CLIENT_URL must be a valid URL")
      .default("http://localhost:5173"),

    CORS_ORIGINS: z.string().optional().default(""),

    CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
    CLOUDINARY_API_KEY: z.string().optional().default(""),
    CLOUDINARY_API_SECRET: z.string().optional().default(""),

    WHATSAPP_ENABLED: booleanFromString(false),
    WHATSAPP_SEND_CUSTOMER_CONFIRMATION: booleanFromString(false),
    WHATSAPP_GRAPH_API_VERSION: z.string().optional().default("v20.0"),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
    WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
    WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),
    TRAVELEX_ADMIN_WHATSAPP: z.string().optional().default("923111444192"),
    WHATSAPP_AUTO_REPLY_ENABLED: booleanFromString(true),
WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(""),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET must be at least 32 characters in production",
        })
      }

      if (!env.CLOUDINARY_CLOUD_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_CLOUD_NAME"],
          message: "CLOUDINARY_CLOUD_NAME is required in production",
        })
      }

      if (!env.CLOUDINARY_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_API_KEY"],
          message: "CLOUDINARY_API_KEY is required in production",
        })
      }

      if (!env.CLOUDINARY_API_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLOUDINARY_API_SECRET"],
          message: "CLOUDINARY_API_SECRET is required in production",
        })
      }
    }

    if (env.WHATSAPP_ENABLED) {
      if (!env.WHATSAPP_PHONE_NUMBER_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["WHATSAPP_PHONE_NUMBER_ID"],
          message: "WHATSAPP_PHONE_NUMBER_ID is required when WhatsApp is enabled",
        })
      }

      if (!env.WHATSAPP_ACCESS_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["WHATSAPP_ACCESS_TOKEN"],
          message: "WHATSAPP_ACCESS_TOKEN is required when WhatsApp is enabled",
        })
      }
if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["WHATSAPP_WEBHOOK_VERIFY_TOKEN"],
    message: "WHATSAPP_WEBHOOK_VERIFY_TOKEN is required when WhatsApp is enabled",
  })
}
      if (!env.TRAVELEX_ADMIN_WHATSAPP) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["TRAVELEX_ADMIN_WHATSAPP"],
          message: "TRAVELEX_ADMIN_WHATSAPP is required when WhatsApp is enabled",
        })
      }
    }
  })
  .transform((env) => {
    const originsSource = env.CORS_ORIGINS || env.CLIENT_URL

    return {
      ...env,
      CORS_ORIGINS_ARRAY: originsSource
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    }
  })

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error("Invalid environment variables:")
  console.error(parsedEnv.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsedEnv.data