import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirectCache } from "../../../src/middleware/cache";
import type { Request, Response, NextFunction } from "express";
import * as service from "../../../src/services/urlService";

vi.mock("../../../src/services/urlService", () => ({
  getUrlByShortCode: vi.fn(),
  incrementClick: vi.fn(() => Promise.resolve()),
}));

type Fn = ReturnType<typeof vi.fn>;
const getUrlByShortCode = (service as unknown as { getUrlByShortCode: Fn }).getUrlByShortCode;

// ตัวช่วยสร้าง req/res/next ปลอมเพื่อทดสอบ middleware โดยไม่ต้องรันเซิร์ฟเวอร์จริง
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

  it("กรณี MISS: ดึงจาก service -> เก็บ cache -> redirect", async () => {
    getUrlByShortCode.mockResolvedValueOnce({ originalUrl: "https://x" });
    const { req, res, next } = mockReqRes("abc");
    await redirectCache(req, res, next);
    expect(getUrlByShortCode).toHaveBeenCalledWith("abc");
    expect(res.set).toHaveBeenCalledWith("X-Cache", "MISS");
    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.redirect).toHaveBeenCalledWith("https://x");
  });

  it("กรณี HIT: redirect ได้เลยโดยไม่เรียก service ซ้ำ", async () => {
    getUrlByShortCode.mockResolvedValueOnce({ originalUrl: "https://y" });
    const first = mockReqRes("dup");
    await redirectCache(first.req, first.res, first.next);

    const second = mockReqRes("dup");
    await redirectCache(second.req, second.res, second.next);

    expect(getUrlByShortCode).toHaveBeenCalledTimes(1);
    expect(second.res.set).toHaveBeenCalledWith("X-Cache", "HIT");
    expect(second.res.status).toHaveBeenCalledWith(302);
  });

  it("ไม่พบใน DB -> เรียก next() เพื่อไป handler ถัดไป", async () => {
    getUrlByShortCode.mockResolvedValueOnce(null);
    const { req, res, next } = mockReqRes("zzz");
    await redirectCache(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
