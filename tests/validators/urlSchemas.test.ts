// ชุดทดสอบสำหรับตัวตรวจสอบสคีมา (Zod) ของ payload
// อธิบาย: ตรวจความถูกต้องของข้อมูลขาเข้าในการสร้าง/อัปเดต URL
import { describe, it, expect } from "vitest";
import { createUrlSchema, updateUrlSchema } from "../../src/validators/urlSchemas";

describe("validators/urlSchemas", () => {
  // createUrlSchema ต้องการฟิลด์ originalUrl และต้องเป็น http(s)
  it("createUrlSchema: accepts valid payload", () => {
    const parsed = createUrlSchema.parse({ originalUrl: "https://example.com" });
    expect(parsed.originalUrl).toBe("https://example.com");
  });

  it("createUrlSchema: rejects non-http(s) url", () => {
    expect(() => createUrlSchema.parse({ originalUrl: "ftp://bad" })).toThrow();
  });

  // updateUrlSchema ต้องมีอย่างน้อย 1 ฟิลด์จาก originalUrl หรือ customCode
  it("updateUrlSchema: requires at least one field", () => {
    expect(() => updateUrlSchema.parse({})).toThrow();
  });

  it("updateUrlSchema: accepts either field", () => {
    expect(() => updateUrlSchema.parse({ originalUrl: "https://x.com" })).not.toThrow();
    expect(() => updateUrlSchema.parse({ customCode: "abc" })).not.toThrow();
  });
});
