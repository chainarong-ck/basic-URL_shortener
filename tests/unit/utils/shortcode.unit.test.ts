import { describe, it, expect, vi, beforeEach } from "vitest";
import * as prismaModule from "../../../src/lib/prisma";
import {
  generateUniqueShortCode,
  DEFAULT_LENGTH,
  MAX_RETRIES,
} from "../../../src/utils/shortcode";

vi.mock("../../../src/lib/prisma", () => ({
  default: {
    url: {
      findUnique: vi.fn(),
    },
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const prisma = (
  prismaModule as unknown as { default: { url: { findUnique: Fn } } }
).default;

describe("utils/generateUniqueShortCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("คืนค่า custom code เมื่อยังไม่ถูกใช้งาน", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(null);
    await expect(generateUniqueShortCode("mycode")).resolves.toBe("mycode");
  });

  it("โยน error เมื่อ custom code ซ้ำกับที่มีอยู่แล้ว", async () => {
    prisma.url.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(generateUniqueShortCode("taken")).rejects.toThrow(
      "CUSTOM_CODE_CONFLICT"
    );
  });

  it("สุ่มโค้ดเมื่อไม่ได้ส่ง custom code มาให้", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(null);
    const code = await generateUniqueShortCode();
    expect(code).toMatch(new RegExp(`^[A-Za-z0-9_-]{${DEFAULT_LENGTH}}$`));
  });

  it("สุ่มซ้ำจนเกิน MAX_RETRIES -> โยน SHORTCODE_GENERATION_FAILED", async () => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      prisma.url.findUnique.mockResolvedValueOnce({ id: i + 1 });
    }

    await expect(generateUniqueShortCode()).rejects.toThrow(
      "SHORTCODE_GENERATION_FAILED"
    );
  });
});
