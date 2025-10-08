/** URL Controller: แปลง HTTP request -> service call -> response JSON */
import type { Request, Response, NextFunction } from "express";
import { createUrlSchema, updateUrlSchema } from "../validators/urlSchemas";
import {
  createUrl,
  getUrlById,
  listUrls,
  updateUrl,
  deleteUrl,
  getUrlByShortCode,
  incrementClick,
} from "../services/urlService";
import type { Url } from "../../generated/prisma";
import { config } from "../config";

// Cache base URL (ลดการคำนวณซ้ำ)
let cachedBase = "";
function baseUrl(): string {
  if (!cachedBase) {
    cachedBase = (config.APP_BASE_URL || "").replace(/\/$/, "");
  }
  return cachedBase;
}

/**
 * สร้าง short URL ใหม่
 * @route POST /api/shorten
 * @body originalUrl string; customCode? string
 * @returns 201 JSON { id, originalUrl, shortCode, shortUrl, ... }
 */
export async function shorten(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createUrlSchema.parse(req.body);
    const created = await createUrl(parsed);
    res.status(201).json(serialize(created));
  } catch (err) {
    next(err);
  }
}

/**
 * อ่าน URL record ตาม id
 * @route GET /api/urls/:id
 * @returns 200 JSON หรือ 404
 */
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const found = await getUrlById(req.params.id);
    if (!found) return res.status(404).json({ error: "Not Found" });
    res.status(200).json(serialize(found));
  } catch (err) {
    next(err);
  }
}

/**
 * แสดงรายการ URL แบบแบ่งหน้า
 * @route GET /api/urls?page&limit
 * @query page number (default 1)
 * @query limit number (default 20)
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page || "1"));
    const limit = parseInt(String(req.query.limit || "20"));
    const result = await listUrls(page, limit);
    res.status(200).json({
      ...result,
      items: result.items.map(serialize),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * อัพเดต URL (originalUrl หรือ customCode อย่างน้อยหนึ่ง)
 * @route PUT /api/urls/:id
 */
export async function updateOne(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = updateUrlSchema.parse(req.body);
    const updated = await updateUrl(req.params.id, parsed);
    res.status(200).json(serialize(updated));
  } catch (err) {
    next(err);
  }
}

/** ลบ URL ตาม id */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteUrl(req.params.id);
    res.status(204).json();
  } catch (err) {
    next(err);
  }
}

/** คืนสถิติพื้นฐานของ URL (ไม่รวม originalUrl) */
export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const found = await getUrlById(req.params.id);
    if (!found) return res.status(404).json({ error: "Not Found" });
    const { clickCount, createdAt, lastAccessed, id } = found;
    res.status(200).json({ id, clickCount, createdAt, lastAccessed });
  } catch (err) {
    next(err);
  }
}

/**
 * Redirect ไปยัง originalUrl ด้วย shortCode
 * @route GET /:shortCode
 * @returns 302 หรือ 404
 */
export async function redirectShort(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const shortCode = req.params.shortCode;
    const found = await getUrlByShortCode(shortCode);
    if (!found) return res.status(404).send("Not Found");
    await incrementClick(shortCode);
    res.set("Cache-Control", "no-cache");
    res.status(302).redirect(found.originalUrl);
  } catch (err) {
    next(err);
  }
}

/** แปลง Url model -> response JSON */
function serialize(model: Url) {
  return {
    id: model.id,
    originalUrl: model.originalUrl,
    shortCode: model.shortCode,
    shortUrl: `${baseUrl()}/${model.shortCode}`,
    clickCount: model.clickCount,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    lastAccessed: model.lastAccessed || null,
  };
}
