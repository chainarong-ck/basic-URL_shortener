/**
 * Zod schemas for URL creation & update payloads.
 */
import { z } from "zod";

export const shortCodeRegex = /^[A-Za-z0-9_-]{3,32}$/;

/**
 * createUrlSchema:
 * - originalUrl: required, must be a valid http(s) URL
 * - customCode: optional, if provided must match shortCodeRegex
 */
export const createUrlSchema = z.object({
  originalUrl: z
    .url()
    .refine((v) => /^https?:\/\//.test(v), "Only http/https URLs allowed"),
  customCode: z.string().regex(shortCodeRegex, "Invalid customCode").optional(),
});

/**
 * updateUrlSchema:
 * - At least one of originalUrl or customCode must be provided
 * - originalUrl: if provided, must be a valid http(s) URL
 * - customCode: if provided, must match shortCodeRegex
 */
export const updateUrlSchema = z
  .object({
    originalUrl: z
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
