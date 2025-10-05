/**
 * Zod schemas for URL creation & update payloads.
 */
import { z } from "zod";

export const shortCodeRegex = /^[A-Za-z0-9_-]{3,32}$/;

export const createUrlSchema = z.object({
  originalUrl: z
    .string()
    .url()
    .refine((v) => /^https?:\/\//.test(v), "Only http/https URLs allowed"),
  customCode: z.string().regex(shortCodeRegex, "Invalid customCode").optional(),
});

export const updateUrlSchema = z
  .object({
    originalUrl: z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v), "Only http/https URLs allowed")
      .optional(),
    customCode: z
      .string()
      .regex(shortCodeRegex, "Invalid customCode")
      .optional(),
  })
  .refine((data) => data.originalUrl || data.customCode, {
    message: "At least one field required",
  });

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
export type UpdateUrlInput = z.infer<typeof updateUrlSchema>;
