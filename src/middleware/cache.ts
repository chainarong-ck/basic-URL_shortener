/** In-memory redirect cache (single-instance). ใช้ Redis ใน multi-instance production. */
import type { Request, Response, NextFunction } from "express";
import { getUrlByShortCode, incrementClick } from "../services/urlService";
import { config } from "../config";

interface CacheEntry {
  value: string;
  expires: number;
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = config.REDIRECT_CACHE_TTL_MS; // validated default in config
const MAX_ITEMS = config.REDIRECT_CACHE_MAX;
// Interval for background sweeping of expired entries: default half of TTL
const SWEEP_MS = config.REDIRECT_CACHE_SWEEP_MS;
let sweepTimer: NodeJS.Timeout | undefined;

function gcIfNeeded() {
  if (cache.size <= MAX_ITEMS) return;
  // ลบครึ่งหนึ่งแบบ simple strategy (ไม่ใช่ LRU เต็มรูปแบบ เพื่อความเบา)
  const keys = [...cache.keys()];
  for (let i = 0; i < Math.ceil(keys.length / 2); i++) {
    cache.delete(keys[i]);
  }
}

/**
 * ลบรายการที่หมดอายุออกจาก cache (scan ทั้ง Map แบบเบา ๆ)
 */
function sweepExpired(now = Date.now()) {
  for (const [k, v] of cache) {
    if (v.expires <= now) cache.delete(k);
  }
}

/**
 * เริ่ม job สำหรับกวาดล้าง cache ที่หมดอายุแบบอัตโนมัติ
 * เรียกซ้ำได้ ปลอดภัย (จะไม่สร้าง interval ซ้ำ)
 */
export function startRedirectCacheSweeper() {
  if (sweepTimer || SWEEP_MS <= 0) return;
  sweepTimer = setInterval(() => sweepExpired(), SWEEP_MS);
}

/** หยุด job สำหรับกวาดล้าง cache */
export function stopRedirectCacheSweeper() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = undefined;
  }
}

/**
 * Middleware: ให้บริการ redirect จาก cache หากพบ shortCode
 * - cache hit: ตอบ 302 + increment click async
 * - miss: query DB, cache แล้วตอบ 302 (increment async)
 */
export async function redirectCache(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const code = req.params.shortCode;
  if (!code) return next();
  const now = Date.now();
  const hit = cache.get(code);
  if (hit && hit.expires > now) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "no-cache");
    // Increment click แบบ async fire-and-forget (ไม่ block latency) - จัดการ error เงียบ ๆ
    incrementClick(code).catch(() => {});
    return res.status(302).redirect(hit.value);
  }
  try {
    const found = await getUrlByShortCode(code);
    if (!found) return next(); // ปล่อยให้ controller เดิมจัดการ 404
    cache.set(code, { value: found.originalUrl, expires: now + TTL_MS });
    gcIfNeeded();
    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "no-cache");
    // เพิ่มนับคลิก (ครั้งแรก) โดยไม่รอ promise ก่อน redirect เพื่อความเร็ว
    incrementClick(code).catch(() => {});
    return res.status(302).redirect(found.originalUrl);
  } catch (e) {
    return next(e);
  }
}

/** คืนสถานะ cache (สำหรับ debug/testing) */
export function _cacheStats() {
  return { size: cache.size, ttlMs: TTL_MS, max: MAX_ITEMS };
}

// เริ่ม sweeper อัตโนมัติเมื่อรันแอป (ยกเว้นในสภาพแวดล้อมทดสอบ)
if (config.NODE_ENV !== "test") {
  // ไม่ throw หากเรียกซ้ำจากที่อื่น
  startRedirectCacheSweeper();
}
