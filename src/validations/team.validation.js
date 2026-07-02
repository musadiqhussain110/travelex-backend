import { z } from "zod"

const objectIdRegex = /^[0-9a-fA-F]{24}$/

const roleSchema = z.enum(["superAdmin", "admin", "consultant", "viewer"])

const permissionSchema = z.record(z.string(), z.record(z.string(), z.boolean()))

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === true || value === "true") return true
  if (value === false || value === "false") return false
  return undefined
}, z.boolean().optional())

export const listTeamMembersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    search: z.string().trim().max(100).optional().default(""),
    role: roleSchema.optional(),
    isActive: optionalBooleanQuery,
  }),
})

export const teamMemberIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid team member id."),
  }),
})

export const createTeamMemberSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name cannot exceed 80 characters."),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .max(120, "Email cannot exceed 120 characters."),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(100, "Password cannot exceed 100 characters."),

    role: roleSchema.default("consultant"),

    permissions: permissionSchema.optional(),
  }),
})

export const updateTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid team member id."),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters.")
        .max(80, "Name cannot exceed 80 characters.")
        .optional(),

      email: z
        .string()
        .trim()
        .email("Please provide a valid email address.")
        .max(120, "Email cannot exceed 120 characters.")
        .optional(),

      role: roleSchema.optional(),

      permissions: permissionSchema.optional(),

      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required to update.",
    }),
})

export const updateTeamMemberStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid team member id."),
  }),

  body: z.object({
    isActive: z.boolean(),
  }),
})

export const resetTeamMemberPasswordSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid team member id."),
  }),

  body: z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(100, "Password cannot exceed 100 characters."),
  }),
})