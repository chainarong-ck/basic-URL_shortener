/** URL Service: logic ของ Url entity */
import prisma from "../lib/prisma";
import { generateUniqueShortCode } from "../utils/shortcode";
import type { Url } from "../../generated/prisma";

/** ข้อมูล input สำหรับสร้าง URL */
export interface CreateUrlInput {
  originalUrl: string;
  customCode?: string;
}
/** ข้อมูล input สำหรับอัพเดต URL */
export interface UpdateUrlInput {
  originalUrl?: string;
  customCode?: string;
}

/** แปลง id string -> number; โยน INVALID_ID หากไม่ถูกต้อง */
function parseId(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw new Error("INVALID_ID");
  return n;
}

/**
 * สร้าง URL ใหม่
 * @param data CreateUrlInput
 * @returns Url
 */
export async function createUrl(data: CreateUrlInput): Promise<Url> {
  const { originalUrl, customCode } = data;
  const shortCode = await generateUniqueShortCode(customCode);
  return prisma.url.create({ data: { originalUrl, shortCode } });
}

/** ดึง URL ตาม id */
export async function getUrlById(id: string): Promise<Url | null> {
  return prisma.url.findUnique({ where: { id: parseId(id) } });
}

/** ดึง URL ตาม shortCode */
export async function getUrlByShortCode(
  shortCode: string
): Promise<Url | null> {
  // ใช้ select เฉพาะ field ที่จำเป็นใน redirect path เพื่อลด serialization cost
  return prisma.url.findUnique({ where: { shortCode } });
}

/**
 * แสดงรายการแบบแบ่งหน้า
 * @param page เลขหน้า (เริ่ม 1)
 * @param limit จำนวนต่อหน้า (1..100)
 */
export async function listUrls(
  page = 1,
  limit = 20
): Promise<{ items: Url[]; total: number; page: number; limit: number }> {
  const safePage = page < 1 ? 1 : page;
  const safeLimit = Math.min(Math.max(limit, 1), 100); // จำกัดไม่เกิน 100 เพื่อป้องกัน abuse
  const skip = (safePage - 1) * safeLimit;
  const [items, total] = await Promise.all([
    prisma.url.findMany({ skip, take: safeLimit, orderBy: { id: "desc" } }),
    prisma.url.count(),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
}

/** อัพเดต URL record */
export async function updateUrl(
  id: string,
  data: UpdateUrlInput
): Promise<Url> {
  const numericId = parseId(id);
  // เตรียมข้อมูลที่จะอัปเดต โดย map customCode -> shortCode ให้ตรงกับ schema
  const updateData: { originalUrl?: string; shortCode?: string } = {};
  if (data.originalUrl) updateData.originalUrl = data.originalUrl;
  if (data.customCode) {
    const existing = await prisma.url.findUnique({
      where: { shortCode: data.customCode },
    });
    if (existing && existing.id !== numericId)
      throw new Error("CUSTOM_CODE_CONFLICT");
    // generateUniqueShortCode จะโยน CUSTOM_CODE_CONFLICT หากมีอยู่แล้ว
    await generateUniqueShortCode(data.customCode);
    updateData.shortCode = data.customCode;
  }
  return prisma.url.update({ where: { id: numericId }, data: updateData });
}

/** ลบ URL แบบ idempotent: หากไม่พบก็ไม่ error */
export async function deleteUrl(id: string): Promise<void> {
  const numericId = parseId(id);
  // ใช้ deleteMany เพื่อหลีกเลี่ยง Prisma P2025 เมื่อไม่พบ record
  await prisma.url.deleteMany({ where: { id: numericId } });
}

/** เพิ่มตัวนับคลิก + ปรับปรุง lastAccessed */
export async function incrementClick(shortCode: string): Promise<Url> {
  // ใช้ update statement เดียว atomic: เพิ่ม clickCount + set lastAccessed
  return prisma.url.update({
    where: { shortCode },
    data: { clickCount: { increment: 1 }, lastAccessed: new Date() },
  });
}
