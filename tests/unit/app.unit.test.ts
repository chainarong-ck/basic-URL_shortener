import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

async function getApp() {
  // ตั้งค่า ENV ให้พฤติกรรมคงที่สำหรับการทดสอบ
  process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
  process.env.CORS_ORIGIN = "https://a.com, https://b.com";
  process.env.APP_BASE_URL = "https://short.local/";
  vi.resetModules();
  const mod = await import("../../src/app");
  return mod.default;
}

describe("app wiring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ให้บริการไฟล์ static index.html ที่หน้า /", async () => {
    const app = await getApp();
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/URL Shortener/i);
  });

  it("ตั้งค่า Security headers (helmet)", async () => {
    const app = await getApp();
    const res = await request(app).get("/");
    // ตรวจสอบ header บางตัวที่มาจาก helmet
    expect(res.header["x-dns-prefetch-control"]).toBeDefined();
    expect(res.header["x-content-type-options"]).toBe("nosniff");
  });

  it("ตั้งค่า CORS ให้อนุญาต origin ตามรายการที่กำหนด", async () => {
    const app = await getApp();
    const res = await request(app).get("/").set("Origin", "https://a.com");
    expect(res.headers["access-control-allow-origin"]).toBe("https://a.com");
  });
});
