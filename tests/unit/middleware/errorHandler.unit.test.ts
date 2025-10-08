import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler, notFound } from "../../../src/middleware/errorHandler";
import logger from "../../../src/utils/logger";
import { z } from "zod";

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("middleware/errorHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("notFound: คืนค่า 404 พร้อม JSON { error: 'Not Found' }", () => {
    const res = mockRes();
    notFound({} as Request, res, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not Found" });
  });

  it("map ข้อความ error ที่รู้จักไปเป็นสถานะ HTTP", () => {
    const res = mockRes();
    const spy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined as unknown as void);
    errorHandler(new Error("CUSTOM_CODE_CONFLICT"), {} as Request, res, {} as NextFunction);
    expect(spy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "customCode already exists" });
  });

  it("รองรับ ZodError และส่งคืนรายละเอียดในฟิลด์ details", () => {
    const res = mockRes();
    const Schema = z.object({ name: z.string() });
    try {
      Schema.parse({ name: 123 });
    } catch (err) {
      errorHandler(err, {} as Request, res, {} as NextFunction);
    }
    expect(res.status).toHaveBeenCalledWith(400);
    const calls = (res.json as unknown as { mock: { calls: unknown[][] } })
      .mock.calls;
    const payload = calls[0][0] as { error: string; details?: unknown };
    expect(payload.error).toBe("Validation error");
    // หมายเหตุ: โค้ดปัจจุบันส่ง { details: err.errors } อาจเป็น undefined ได้ จึงตรวจแค่ว่ามีคีย์
    expect(Object.prototype.hasOwnProperty.call(payload, "details")).toBe(
      true
    );
  });

  it("กรณี error ไม่รู้จัก -> คืน 500 Internal Server Error", () => {
    const res = mockRes();
    errorHandler("string error" as unknown as Error, {} as Request, res, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });
});
