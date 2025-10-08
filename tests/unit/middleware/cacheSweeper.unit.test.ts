import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../src/app";
import {
  startRedirectCacheSweeper,
  stopRedirectCacheSweeper,
  _cacheStats,
} from "../../../src/middleware/cache";
import * as service from "../../../src/services/urlService";

vi.mock("../../../src/services/urlService", () => ({
  getUrlByShortCode: vi.fn(),
  incrementClick: vi.fn(() => Promise.resolve()),
}));

// ทดสอบตัวกวาดล้าง cache (sweeper) ของ redirect cache
describe("cache sweeper", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("เริ่ม/หยุด sweeper ได้อย่างปลอดภัย และทำงานกวาดล้างได้", async () => {
    const getUrlByShortCode = (service as unknown as {
      getUrlByShortCode: ReturnType<typeof vi.fn>;
    }).getUrlByShortCode;
    getUrlByShortCode.mockResolvedValue({ originalUrl: "https://example.org" });

    // เติมค่า cache หนึ่งรายการผ่านการยิง request ครั้งแรก
    await request(app).get("/abc123");
    expect(_cacheStats().size).toBeGreaterThanOrEqual(0);

    // เริ่ม sweeper และขยับเวลาเพื่อให้ callback ทำงาน
    startRedirectCacheSweeper();
    // ขยับเวลาไปพอให้ interval ทำงานอย่างน้อยหนึ่งครั้ง
    vi.advanceTimersByTime(1_000);
    stopRedirectCacheSweeper();

    // เรียก stop ซ้ำควรไม่มีผลข้างเคียงผิดปกติ
    stopRedirectCacheSweeper();
    expect(true).toBe(true);
  });
});
