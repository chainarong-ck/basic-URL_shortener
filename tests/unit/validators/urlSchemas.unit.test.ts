import { describe, it, expect } from "vitest";
import {
  createUrlSchema,
  updateUrlSchema,
} from "../../../src/validators/urlSchemas";

describe("validators/urlSchemas", () => {
  it("createUrlSchema: accepts valid payload (http)", () => {
    const parsed = createUrlSchema.parse({ originalUrl: "http://example.com" });
    expect(parsed.originalUrl).toBe("http://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  it("createUrlSchema: accepts valid payload (https)", () => {
    const parsed = createUrlSchema.parse({
      originalUrl: "https://example.com"
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  it("createUrlSchema: รับค่าพร้อม customCode ที่ถูกต้อง", () => {
    const parsed = createUrlSchema.parse({
      originalUrl: "https://example.com",
      customCode: "my-code_123",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBe("my-code_123");
  });

  it("createUrlSchema: ปฏิเสธ customCode ที่ไม่ถูกต้อง", () => {
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "no",
      })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "1234567890123456789012345678901234567890",
      })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "invalid*code",
      })
    ).toThrow();
  });

  it("createUrlSchema: ปฏิเสธรูปแบบ URL ที่ไม่ถูกต้อง", () => {
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

  it("createUrlSchema: ปฏิเสธ URL ที่ไม่ใช่ http/https", () => {
    expect(() => createUrlSchema.parse({ originalUrl: "ftp://bad" })).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "file://local" })
    ).toThrow();
    expect(() =>
      createUrlSchema.parse({ originalUrl: "mailto:someone@example.com" })
    ).toThrow();
  });

  it("createUrlSchema: ปฏิเสธหากขาด originalUrl", () => {
    expect(() => createUrlSchema.parse({})).toThrow();
  });

  it("updateUrlSchema: accepts valid payload http", () => {
    const parsed = updateUrlSchema.parse({ originalUrl: "http://example.com" });
    expect(parsed.originalUrl).toBe("http://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  it("updateUrlSchema: accepts valid payload https", () => {
    const parsed = updateUrlSchema.parse({
      originalUrl: "https://example.com",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBeUndefined();
  });

  it("updateUrlSchema: รับค่าพร้อม customCode ที่ถูกต้อง", () => {
    const parsed = updateUrlSchema.parse({
      originalUrl: "https://example.com",
      customCode: "my-code_123",
    });
    expect(parsed.originalUrl).toBe("https://example.com");
    expect(parsed.customCode).toBe("my-code_123");
  });

  it("updateUrlSchema: ปฏิเสธ customCode ที่ไม่ถูกต้อง", () => {
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "no",
      })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "1234567890123456789012345678901234567890",
      })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({
        originalUrl: "https://example.com",
        customCode: "invalid*code",
      })
    ).toThrow();
  });

  it("updateUrlSchema: ปฏิเสธรูปแบบ URL ที่ไม่ถูกต้อง", () => {
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

  it("updateUrlSchema: ปฏิเสธ URL ที่ไม่ใช่ http/https", () => {
    expect(() => updateUrlSchema.parse({ originalUrl: "ftp://bad" })).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "file://local" })
    ).toThrow();
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "mailto:someone@example.com" })
    ).toThrow();
  });

  it("updateUrlSchema: ต้องมีอย่างน้อย 1 ฟิลด์ (originalUrl/customCode)", () => {
    expect(() => updateUrlSchema.parse({})).toThrow();
  });

  it("updateUrlSchema: รับได้หากมีฟิลด์ใดฟิลด์หนึ่ง", () => {
    expect(() =>
      updateUrlSchema.parse({ originalUrl: "https://x.com" })
    ).not.toThrow();
    expect(() => updateUrlSchema.parse({ customCode: "abc" })).not.toThrow();
  });
});
