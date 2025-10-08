import { describe, it, expect, beforeEach } from "vitest";

// ใช้ isolated modules เพื่อทดสอบพฤติกรรม cache ของ config แยกต่อเคส

describe("config load and cache", () => {
  beforeEach(() => {
    // reset relevant envs
    process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
  });

  it("โหลดค่าและใช้ค่า default พร้อมแคชผลลัพธ์", async () => {
    const mod1 = await import("../../src/config");
    const first = mod1.loadConfig();
    const second = mod1.loadConfig();
    expect(first).toBe(second); // cached object reference
    expect(first.APP_PORT).toBeGreaterThan(0);
  });

  it("โยน error เมื่อขาด ENV ที่จำเป็น เช่น DATABASE_URL (ผ่านการ isolate module)", async () => {
    const old = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    // fresh import will execute schema parse then export
    await expect(import("../../src/config?no-cache=" + Date.now())).rejects.toThrow(/Invalid environment variables/);
    if (old) process.env.DATABASE_URL = old;
  });
});
