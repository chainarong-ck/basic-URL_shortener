// ชุดทดสอบสำหรับ Controller (ชั้นรับ HTTP request/response)
// อธิบาย: ใช้ supertest ส่ง HTTP ไปยังแอป Express และ mock service ชั้นล่างเพื่อคุมผลลัพธ์
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import * as service from "../../src/services/urlService";

// Mock service ทั้งหมดเพื่อไม่ให้มี side-effect กับฐานข้อมูล/ลอจิกจริง
vi.mock("../../src/services/urlService", () => ({
  createUrl: vi.fn(),
  getUrlById: vi.fn(),
  listUrls: vi.fn(),
  updateUrl: vi.fn(),
  deleteUrl: vi.fn(),
  getUrlByShortCode: vi.fn(),
  incrementClick: vi.fn(),
}));

type Fn = ReturnType<typeof vi.fn>;
const createUrl = (service as unknown as { createUrl: Fn }).createUrl;
const getUrlById = (service as unknown as { getUrlById: Fn }).getUrlById;
const listUrls = (service as unknown as { listUrls: Fn }).listUrls;
const updateUrl = (service as unknown as { updateUrl: Fn }).updateUrl;
const deleteUrl = (service as unknown as { deleteUrl: Fn }).deleteUrl;

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

describe("controllers/urlController", () => {
  beforeEach(() => vi.clearAllMocks());

  /*
   เทสต์: POST /api/shorten -> 201
   - Arrange: ให้ service.createUrl คืนเรคคอร์ดตัวอย่าง (สมมุติสร้างสำเร็จ)
   - Act: เรียก HTTP POST พร้อม payload { originalUrl }
   - Assert: สเตตัส 201, body.shortCode ตรงคาด และ shortUrl ลงท้ายด้วย /c1
  */
  it("POST /api/shorten -> 201", async () => {
    createUrl.mockResolvedValueOnce(sample(1));
    const res = await request(app).post("/api/shorten").send({ originalUrl: "https://ex.com" });
    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe("c1");
    expect(res.body.shortUrl).toMatch(/\/c1$/);
  });

  /*
   เทสต์: GET /api/urls/:id -> 200 | 404
   - กรณีพบ: ให้ service.getUrlById คืนเรคคอร์ด -> ควรได้ 200 และ body.id ตามที่ค้นหา
   - กรณีไม่พบ: ให้ service.getUrlById คืน null -> ควรได้ 404
  */
  it("GET /api/urls/:id -> 200 | 404", async () => {
    getUrlById.mockResolvedValueOnce(sample(2));
    const found = await request(app).get("/api/urls/2");
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(2);

    getUrlById.mockResolvedValueOnce(null);
    const missing = await request(app).get("/api/urls/999");
    expect(missing.status).toBe(404);
  });

  /*
   เทสต์: GET /api/urls -> list with items
   - Arrange: ให้ service.listUrls คืนผลรวม 1 รายการ
   - Act: ยิง GET โดยไม่ส่งพารามิเตอร์ (ใช้ค่า default)
   - Assert: 200 และรายการตัวแรกมี id = 3
  */
  it("GET /api/urls -> list with items", async () => {
    const s = sample(3);
    listUrls.mockResolvedValueOnce({ items: [s], total: 1, page: 1, limit: 20 });
    const res = await request(app).get("/api/urls");
    expect(res.status).toBe(200);
    expect(res.body.items[0].id).toBe(3);
  });

  /*
   เทสต์: PUT /api/urls/:id -> 200
   - Arrange: ให้ service.updateUrl คืนเรคคอร์ดอัปเดตสำเร็จ
   - Act: ส่ง PUT พร้อม payload
   - Assert: 200 และ body.id ที่ได้กลับมา = 4
  */
  it("PUT /api/urls/:id -> 200", async () => {
    updateUrl.mockResolvedValueOnce(sample(4));
    const res = await request(app).put("/api/urls/4").send({ originalUrl: "https://ex.com" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(4);
  });

  /*
   เทสต์: DELETE /api/urls/:id -> 204
   - Arrange: ให้ service.deleteUrl สำเร็จ (resolve undefined)
   - Act: เรียก DELETE ตาม id
   - Assert: สเตตัส 204 ไม่มีเนื้อหา
  */
  it("DELETE /api/urls/:id -> 204", async () => {
    deleteUrl.mockResolvedValueOnce(undefined);
    const res = await request(app).delete("/api/urls/5");
    expect(res.status).toBe(204);
  });
});
