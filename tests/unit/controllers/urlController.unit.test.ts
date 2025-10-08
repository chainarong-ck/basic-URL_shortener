import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// รวมกรณีทดสอบ Controller ทั้งหมดไว้ไฟล์เดียว
// - ครอบคลุมเส้นทาง CRUD ภายใต้ /api
// - ครอบคลุมสาขาพิเศษ: validation error และ redirect โดย shortCode

// Mock service ของ controller ทั้งหมดในไฟล์นี้
vi.mock("../../../src/services/urlService", () => ({
  createUrl: vi.fn(),
  getUrlById: vi.fn(),
  listUrls: vi.fn(),
  updateUrl: vi.fn(),
  deleteUrl: vi.fn(),
  getUrlByShortCode: vi.fn(),
  incrementClick: vi.fn(),
}));

type MockedService = {
  createUrl: ReturnType<typeof vi.fn>;
  getUrlById: ReturnType<typeof vi.fn>;
  listUrls: ReturnType<typeof vi.fn>;
  updateUrl: ReturnType<typeof vi.fn>;
  deleteUrl: ReturnType<typeof vi.fn>;
  getUrlByShortCode: ReturnType<typeof vi.fn>;
  incrementClick: ReturnType<typeof vi.fn>;
};

// ผู้ช่วย: โหลด app และ service ใหม่ทุกครั้ง เพื่อให้แน่ใจว่าใช้ mock/ENV ล่าสุด
async function getAppAndService(): Promise<{
  app: import("express").Express;
  service: MockedService;
}> {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
  vi.resetModules();
  const appMod = await import("../../../src/app");
  const svc = (await import("../../../src/services/urlService")) as unknown as MockedService;
  return { app: appMod.default as import("express").Express, service: svc };
}

function sample(id: number) {
  const now = new Date();
  return {
    id,
    originalUrl: "https://ex.com",
    shortCode: `c${id}`,
    clickCount: 0,
    createdAt: now,
    updatedAt: now,
    lastAccessed: null,
  };
}

describe("controllers/urlController (รวม CRUD + สาขาพิเศษ)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ——— เคส CRUD ใต้ /api ———
  it("POST /api/shorten -> 201 สร้าง short URL ใหม่สำเร็จ", async () => {
    const { app, service } = await getAppAndService();
    service.createUrl.mockResolvedValueOnce(sample(1));
    const res = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://ex.com" });
    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe("c1");
    expect(res.body.shortUrl).toMatch(/\/c1$/);
  });

  it("GET /api/urls/:id -> 200 เมื่อพบ | 404 เมื่อไม่พบ", async () => {
    const { app, service } = await getAppAndService();
    service.getUrlById.mockResolvedValueOnce(sample(2));
    const found = await request(app).get("/api/urls/2");
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(2);

    service.getUrlById.mockResolvedValueOnce(null);
    const missing = await request(app).get("/api/urls/999");
    expect(missing.status).toBe(404);
  });

  it("GET /api/urls -> ได้รายการพร้อมข้อมูลภายใน", async () => {
    const { app, service } = await getAppAndService();
    const s = sample(3);
    service.listUrls.mockResolvedValueOnce({ items: [s], total: 1, page: 1, limit: 20 });
    const res = await request(app).get("/api/urls");
    expect(res.status).toBe(200);
    expect(res.body.items[0].id).toBe(3);
  });

  it("PUT /api/urls/:id -> 200 อัปเดตข้อมูลสำเร็จ", async () => {
    const { app, service } = await getAppAndService();
    service.updateUrl.mockResolvedValueOnce(sample(4));
    const res = await request(app)
      .put("/api/urls/4")
      .send({ originalUrl: "https://ex.com" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(4);
  });

  it("DELETE /api/urls/:id -> 204 ลบสำเร็จ (ไม่มีเนื้อหา)", async () => {
    const { app, service } = await getAppAndService();
    service.deleteUrl.mockResolvedValueOnce(undefined);
    const res = await request(app).delete("/api/urls/5");
    expect(res.status).toBe(204);
  });

  // ——— เคสสาขาพิเศษ: validation error + redirect ———
  it("POST /api/shorten -> 400 on validation error", async () => {
    const { app } = await getAppAndService();
    const res = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "not-a-url" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("GET /:shortCode -> 404 when not found (controller fallback)", async () => {
    const { app, service } = await getAppAndService();
    service.getUrlByShortCode.mockResolvedValueOnce(null);
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
  });

  it("GET /:shortCode -> 302 and increments", async () => {
    const { app, service } = await getAppAndService();
    service.getUrlByShortCode.mockResolvedValueOnce({ originalUrl: "https://go" });
    service.incrementClick.mockResolvedValueOnce({});
    const res = await request(app).get("/ok").redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://go");
  });
});
