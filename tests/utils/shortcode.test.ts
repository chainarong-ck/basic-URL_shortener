// ชุดทดสอบสำหรับยูทิลิตี้ generateUniqueShortCode
// อธิบาย: ฟังก์ชันนี้เลือกใช้ custom code ถ้าไม่ซ้ำ หรือสุ่มโค้ดความยาว 7 ตัวเมื่อไม่ได้ระบุ custom
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as prismaModule from "../../src/lib/prisma";
import {
  generateUniqueShortCode,
  DEFAULT_LENGTH,
  MAX_RETRIES,
} from "../../src/utils/shortcode";

vi.mock("../../src/lib/prisma", () => ({
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

  /*
   เทสต์: returns custom code when unused
   - Arrange: ให้ prisma.url.findUnique คืน null (หมายถึงโค้ดนี้ยังไม่ถูกใช้)
   - Act: เรียก generateUniqueShortCode("mycode")
   - Assert: คืนค่าเป็น "mycode" ตามที่ส่ง
  */
  it("returns custom code when unused", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(null);
    await expect(generateUniqueShortCode("mycode")).resolves.toBe("mycode");
  });

  /*
   เทสต์: throws when custom code conflicts
   - Arrange: ให้ prisma.url.findUnique คืนอ็อบเจ็กต์ (พบแล้ว แปลว่าซ้ำ)
   - Act & Assert: เรียกแล้วต้อง throw ด้วยข้อความ "CUSTOM_CODE_CONFLICT"
  */
  it("throws when custom code conflicts", async () => {
    prisma.url.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(generateUniqueShortCode("taken")).rejects.toThrow(
      "CUSTOM_CODE_CONFLICT"
    );
  });

  /*
   เทสต์: generates random code when no custom provided
   - Arrange: ให้ prisma.url.findUnique คืน null ในการตรวจสอบครั้งแรก (ไม่เจอซ้ำ)
   - Act: เรียกโดยไม่ส่ง custom
   - Assert: โค้ดที่ได้ยาว 7 ตัว และอยู่ในชุดตัวอักษรที่กำหนด
  */
  it("generates random code when no custom provided", async () => {
    // first check returns not found
    prisma.url.findUnique.mockResolvedValueOnce(null);
    const code = await generateUniqueShortCode();
    expect(code).toMatch(new RegExp(`^[A-Za-z0-9_-]{${DEFAULT_LENGTH}}$`));
  });

  /*
   เทสต์: throws SHORTCODE_GENERATION_FAILED เมื่อชนทุกครั้งจนเกิน MAX_RETRIES
   - Arrange: ให้ prisma.url.findUnique คืนค่าเป็นอ็อบเจ็กต์ทุกครั้งตามจำนวน MAX_RETRIES (แปลว่าโค้ดชน)
   - Act & Assert: เรียกแล้วต้อง throw ด้วยข้อความ "SHORTCODE_GENERATION_FAILED"
   - Extra: ตรวจจำนวนครั้งที่เรียก nanoid และ findUnique ต้องเท่ากับ MAX_RETRIES
  */
  it("throws SHORTCODE_GENERATION_FAILED after exhausting retries", async () => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      prisma.url.findUnique.mockResolvedValueOnce({ id: i + 1 });
    }

    await expect(generateUniqueShortCode()).rejects.toThrow(
      "SHORTCODE_GENERATION_FAILED"
    );
  });
});
