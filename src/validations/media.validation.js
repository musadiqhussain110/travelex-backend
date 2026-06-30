import { z } from "zod";

const folderSchema = z.enum([
  "umrah",
  "tours",
  "visa",
  "blogs",
  "banners",
  "general"
]);

export const uploadMediaSchema = z.object({
  body: z.object({
    folder: folderSchema.optional().default("general")
  })
});

export const deleteMediaSchema = z.object({
  body: z.object({
    publicId: z
      .string()
      .trim()
      .min(3, "Cloudinary publicId is required")
  })
});