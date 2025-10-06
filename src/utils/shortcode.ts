/**
 * Short code generation utility with collision retry support.
 */
import { nanoid } from "nanoid";
import prisma from "../lib/prisma";

export const DEFAULT_LENGTH = 7;
export const MAX_RETRIES = 5;

/**
 * Generate a unique short code.
 * If customCode provided ensure uniqueness, else generate using nanoid.
 * Retries up to MAX_RETRIES times on collision.
 * @throws CUSTOM_CODE_CONFLICT when custom code already exists.
 * @throws SHORTCODE_GENERATION_FAILED when unable to generate unique code.
 */
export async function generateUniqueShortCode(
  customCode?: string
): Promise<string> {
  if (customCode) {
    const existing = await prisma.url.findUnique({
      where: { shortCode: customCode },
    });
    if (existing) throw new Error("CUSTOM_CODE_CONFLICT");
    return customCode;
  }
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = nanoid(DEFAULT_LENGTH);
    const existing = await prisma.url.findUnique({
      where: { shortCode: code },
    });
    if (!existing) return code;
  }
  throw new Error("SHORTCODE_GENERATION_FAILED");
}
