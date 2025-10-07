// ชุดทดสอบสำหรับตัวตรวจสอบสคีมา (Zod) ของ payload
// อธิบาย: ตรวจความถูกต้องของข้อมูลขาเข้าในการสร้าง/อัปเดต URL
import { describe, it, expect } from "vitest";
import {
  createUrlSchema,
  updateUrlSchema,
} from "../../src/validators/urlSchemas";

describe("validators/urlSchemas", () => {
  /**
   * createUrlSchema
   */
  // ต้องการฟิลด์ originalUrl ที่เป็น http
  it("createUrlSchema: accepts valid payload http", () => {
    const parsed = createUrlSchema.parse({ originalUrl: "http://example.com" });
    expect(parsed.originalUrl).toBe("http://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  // ต้องการฟิลด์ originalUrl ที่เป็น https
  it("createUrlSchema: accepts valid payload https", () => {
    const parsed = createUrlSchema.parse({
      originalUrl: "https://example.com",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  // originalUrl ที่ถูกต้องพร้อม customCode
  it("createUrlSchema: accepts valid payload with customCode", () => {
    const parsed = createUrlSchema.parse({
      originalUrl: "https://example.com",
      customCode: "my-code_123",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBe("my-code_123");
  });

  // customCode ที่ไม่ถูกต้อง
  it("createUrlSchema: rejects invalid customCode", () => {
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "no", // สั้นเกินไป
      })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "1234567890123456789012345678901234567890", // ยาวเกินไป
      })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "invalid*code", // มีอักขระไม่ถูกต้อง
      })
    ).toThrow();
  });

  // originalUrl ที่ไม่ใช่ URL ไม่ถูกต้อง
  it("createUrlSchema: rejects invalid url format", () => {
    expect(() => createUrlSchema.parse({ originalUrl: "not-a-url" })).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "http//missing-colon" })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "://missing-scheme" })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "http:/one-slash.com" })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "http://in valid.com" })
    ).toThrow();
    expect(() => createUrlSchema.parse({ originalUrl: "" })).toThrow();
  });

  // originalUrl ต้องเป็น http หรือ https เท่านั้น
  it("createUrlSchema: rejects non-http(s) url", () => {
    expect(() => createUrlSchema.parse({ originalUrl: "ftp://bad" })).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "file://local" })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "mailto:someone@example.com" })
    ).toThrow();
  });

  // originalUrl ห้ามขาดหาย
  it("createUrlSchema: rejects missing originalUrl", () => {
    expect(() => createUrlSchema.parse({})).toThrow();
  });

  /**
   * updateUrlSchema
   */
  // ต้องการฟิลด์ originalUrl ที่เป็น http
  it("updateUrlSchema: accepts valid payload http", () => {
    const parsed = updateUrlSchema.parse({ originalUrl: "http://example.com" });
    expect(parsed.originalUrl).toBe("http://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  // ต้องการฟิลด์ originalUrl ที่เป็น https
  it("updateUrlSchema: accepts valid payload https", () => {
    const parsed = updateUrlSchema.parse({
      originalUrl: "https://example.com",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  // originalUrl ที่ถูกต้องพร้อม customCode
  it("updateUrlSchema: accepts valid payload with customCode", () => {
    const parsed = updateUrlSchema.parse({
      originalUrl: "https://example.com",
      customCode: "my-code_123",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBe("my-code_123");
  });

  // customCode ที่ไม่ถูกต้อง
  it("updateUrlSchema: rejects invalid customCode", () => {
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "no", // สั้นเกินไป
      })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "1234567890123456789012345678901234567890", // ยาวเกินไป
      })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "invalid*code", // มีอักขระไม่ถูกต้อง
      })
    ).toThrow();
  });

  // originalUrl ที่ไม่ใช่ URL ไม่ถูกต้อง
  it("updateUrlSchema: rejects invalid url format", () => {
    expect(() => updateUrlSchema.parse({ originalUrl: "not-a-url" })).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "http//missing-colon" })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "://missing-scheme" })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "http:/one-slash.com" })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "http://in valid.com" })
    ).toThrow();
    expect(() => updateUrlSchema.parse({ originalUrl: "" })).toThrow();
  });

  // originalUrl ต้องเป็น http หรือ https เท่านั้น
  it("updateUrlSchema: rejects non-http(s) url", () => {
    expect(() => updateUrlSchema.parse({ originalUrl: "ftp://bad" })).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "file://local" })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "mailto:someone@example.com" })
    ).toThrow();
  });

  // ต้องมีอย่างน้อย 1 ฟิลด์จาก originalUrl หรือ customCode
  it("updateUrlSchema: requires at least one field", () => {
    expect(() => updateUrlSchema.parse({})).toThrow();
  });

  // ยอมรับได้ถ้ามีฟิลด์ใดฟิลด์หนึ่ง
  it("updateUrlSchema: accepts either field", () => {
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "https://x.com" })
    ).not.toThrow();
    expect(() => updateUrlSchema.parse({ customCode: "abc" })).not.toThrow();
  });
});
