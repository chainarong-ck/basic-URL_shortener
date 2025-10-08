import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/lib/prisma";

// การทดสอบแบบ Integration: ทดสอบเส้นทางจริงกับฐานข้อมูล SQLite (dev.db)
// หมายเหตุ: ล้างข้อมูลในตาราง Url ก่อนแต่ละเทสต์ เพื่อไม่ให้ข้อมูลค้างจากเคสอื่น
// และตรวจสอบ flow ครบตั้งแต่สร้าง -> อ่าน -> redirect -> ดูสถิติ

// ตั้งค่า ENV ที่จำเป็นสำหรับ config
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
process.env.APP_BASE_URL = "http://localhost:3000";

describe("integration: server and routes", () => {
  beforeAll(async () => {
    // ไม่ต้องทำอะไรเพิ่ม แอปถูก import แล้วพร้อมใช้งาน
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.url.deleteMany({});
  });

  it("ตรวจสอบ health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("ทดสอบ flow สร้าง/อ่าน/สถิติก่อน-หลัง redirect ครบถ้วน", async () => {
    // สร้าง short URL
    const created = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://example.com/abc" });
    expect(created.status).toBe(201);
    const { id, shortCode, shortUrl } = created.body;
    expect(shortUrl).toMatch(new RegExp(`${shortCode}$`));

    // อ่านรายการหนึ่งรายการ
    const got = await request(app).get(`/api/urls/${id}`);
    expect(got.status).toBe(200);
    expect(got.body.id).toBe(id);

    // สถิติก่อน redirect (ควรเป็น 0)
    const s1 = await request(app).get(`/api/stats/${id}`);
    expect(s1.status).toBe(200);
    expect(s1.body.clickCount).toBe(0);

    // redirect ไปยังปลายทาง และไม่ตาม redirect ต่อ (ตรวจหัวข้อและสถานะอย่างเดียว)
    const redir = await request(app).get(`/${shortCode}`).redirects(0);
    expect(redir.status).toBe(302);
    expect(redir.headers.location).toBe("https://example.com/abc");

    // สถิติหลัง redirect (ควรเพิ่มเป็น 1)
    const s2 = await request(app).get(`/api/stats/${id}`);
    expect(s2.status).toBe(200);
    expect(s2.body.clickCount).toBe(1);
  });

  it("แสดงรายการ /api/urls (list) ได้ตาม page/limit", async () => {
    // สร้างข้อมูล 2 รายการ
    const created1 = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://example.com/1" });
    const created2 = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://example.com/2" });
    expect(created1.status).toBe(201);
    expect(created2.status).toBe(201);

    // เรียกดูรายการ
    const listRes = await request(app).get("/api/urls?page=1&limit=10");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    // ควรมีอย่างน้อย 2 รายการ
    expect(listRes.body.items.length).toBeGreaterThanOrEqual(2);
    // ตรวจ field สำคัญของ item แรก
    const first = listRes.body.items[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("shortCode");
    expect(first).toHaveProperty("shortUrl");
    expect(first.shortUrl.endsWith(first.shortCode)).toBe(true);
  });

  it("อัปเดตข้อมูล /api/urls/:id เปลี่ยน originalUrl + customCode สำเร็จ", async () => {
    // สร้าง URL ก่อน
    const created = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://old.example.com/path" });
    expect(created.status).toBe(201);
    const { id, shortCode: oldCode } = created.body;

    // อัปเดตทั้ง originalUrl และ customCode ใหม่
    const updated = await request(app)
      .put(`/api/urls/${id}`)
      .send({ originalUrl: "https://new.example.com/path", customCode: "updated_123" });
    expect(updated.status).toBe(200);
    expect(updated.body.id).toBe(id);
    expect(updated.body.originalUrl).toBe("https://new.example.com/path");
    expect(updated.body.shortCode).toBe("updated_123");
    expect(updated.body.shortUrl.endsWith("updated_123")).toBe(true);

    // shortCode เก่าไม่ควรใช้งานได้อีก
    const redirOld = await request(app).get(`/${oldCode}`).redirects(0);
    expect(redirOld.status).toBe(404);

    // shortCode ใหม่ควร redirect ไปปลายทางใหม่
    const redirNew = await request(app).get(`/updated_123`).redirects(0);
    expect(redirNew.status).toBe(302);
    expect(redirNew.headers.location).toBe("https://new.example.com/path");
  });

  it("ลบ /api/urls/:id แล้วควรเข้าถึงไม่ได้ทั้ง getOne/stats/redirect", async () => {
    // สร้าง URL ก่อน
    const created = await request(app)
      .post("/api/shorten")
      .send({ originalUrl: "https://todelete.example.com" });
    expect(created.status).toBe(201);
    const { id, shortCode } = created.body;

    // ลบ
    const delRes = await request(app).delete(`/api/urls/${id}`);
    expect(delRes.status).toBe(204);

    // getOne ควร 404
    const got = await request(app).get(`/api/urls/${id}`);
    expect(got.status).toBe(404);

    // stats ควร 404
    const s = await request(app).get(`/api/stats/${id}`);
    expect(s.status).toBe(404);

    // redirect ด้วย shortCode ควร 404
    const redir = await request(app).get(`/${shortCode}`).redirects(0);
    expect(redir.status).toBe(404);
  });



});
