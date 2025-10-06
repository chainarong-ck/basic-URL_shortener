// ชุดทดสอบสำหรับ middleware redirectCache
// อธิบาย: มีหน้าที่ดึง URL จาก shortCode พร้อมทำ cache ในหน่วยความจำ เพื่อลดการเรียก service ซ้ำ
import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirectCache } from "../../src/middleware/cache";
import type { Request, Response, NextFunction } from "express";
import * as service from "../../src/services/urlService";

// Mock service ที่ถูกเรียกใน middleware
vi.mock("../../src/services/urlService", () => ({
  getUrlByShortCode: vi.fn(),
  incrementClick: vi.fn(() => Promise.resolve()),
}));

type Fn = ReturnType<typeof vi.fn>;
const getUrlByShortCode = (service as unknown as { getUrlByShortCode: Fn }).getUrlByShortCode;
// incrementClick is called asynchronously and we don't assert it directly here.

// ตัวช่วยสร้าง req/res/next ปลอม สำหรับทดสอบ middleware โดยไม่ใช้เซิร์ฟเวอร์จริง
function mockReqRes(code: string) {
  const headers: Record<string, string> = {};
  const res = ({
    set: vi.fn((field: string, value?: string) => {
      headers[field] = String(value);
      return res as unknown as Response;
    }),
    status: vi.fn(() => res as unknown as Response),
    redirect: vi.fn(() => res as unknown as Response),
  } as unknown) as Response;
  const req = { params: { shortCode: code } } as Partial<Request> as Request;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, headers };
}

describe("middleware/redirectCache", () => {
  beforeEach(() => vi.clearAllMocks());

  /*
   เทสต์: cache MISS then set and redirect
   - Arrange: ให้ getUrlByShortCode คืน { originalUrl: "https://x" }
   - Act: เรียก middleware ด้วย shortCode "abc"
   - Assert: X-Cache เป็น MISS, ตอบกลับ 302 และ redirect ไปยัง URL ปลายทาง
  */
  it("cache MISS then set and redirect", async () => {
    getUrlByShortCode.mockResolvedValueOnce({ originalUrl: "https://x" });
    const { req, res, next } = mockReqRes("abc");
    await redirectCache(req, res, next);
    expect(getUrlByShortCode).toHaveBeenCalledWith("abc");
    expect(res.set).toHaveBeenCalledWith("X-Cache", "MISS");
    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.redirect).toHaveBeenCalledWith("https://x");
  });

  /*
   เทสต์: cache HIT should redirect without calling getUrlByShortCode again
   - Arrange: เรียกครั้งแรกเพื่อให้ cache ถูกบันทึก แล้วเรียกครั้งที่สองด้วยโค้ดเดิม
   - Assert: ฟังก์ชัน service ถูกเรียกเพียงครั้งเดียว และครั้งที่สองเป็น HIT
  */
  it("cache HIT should redirect without calling getUrlByShortCode again", async () => {
    // first request populates cache
    getUrlByShortCode.mockResolvedValueOnce({ originalUrl: "https://y" });
    const first = mockReqRes("dup");
    await redirectCache(first.req, first.res, first.next);

    // second request hit
    const second = mockReqRes("dup");
    await redirectCache(second.req, second.res, second.next);

    expect(getUrlByShortCode).toHaveBeenCalledTimes(1);
    expect(second.res.set).toHaveBeenCalledWith("X-Cache", "HIT");
    expect(second.res.status).toHaveBeenCalledWith(302);
  });

  /*
   เทสต์: call next when not found
   - Arrange: ให้ getUrlByShortCode คืน null (ไม่พบ)
   - Act: เรียก middleware
   - Assert: เรียก next() เพื่อลำเลียงไปยังตัวจัดการถัดไป (เช่น คอนโทรลเลอร์จะตอบ 404)
  */
  it("call next when not found", async () => {
    getUrlByShortCode.mockResolvedValueOnce(null);
    const { req, res, next } = mockReqRes("zzz");
    await redirectCache(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
