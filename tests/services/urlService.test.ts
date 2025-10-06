// ชุดทดสอบสำหรับ service ที่ทำงานกับ URL (สร้าง/อ่าน/แก้ไข/ลบ/นับคลิก)
// อธิบายโครง: ใช้แนว Arrange (เตรียมข้อมูล/จำลอง), Act (เรียกใช้งานจริง), Assert (ตรวจสอบผล)
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as prismaModule from "../../src/lib/prisma";
import * as shortcodeModule from "../../src/utils/shortcode";
import {
  createUrl,
  getUrlById,
  listUrls,
  updateUrl,
  deleteUrl,
  incrementClick,
  getUrlByShortCode,
} from "../../src/services/urlService";

// Mock prisma client methods used in the service
// อธิบาย: เรา mock Prisma Client เพื่อให้เทสต์ทำงานได้โดยไม่ต้องเชื่อมต่อฐานข้อมูลจริง
// - สร้าง double ของเมธอดที่ service ใช้: create/findUnique/findMany/count/update/deleteMany
// - จะกำหนดผลลัพธ์คืนค่าของแต่ละเมธอดในแต่ละเทสต์ตามสถานการณ์
vi.mock("../../src/lib/prisma", () => {
  return {
    default: {
      url: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

// Mock short code generator to be deterministic
// อธิบาย: บังคับให้ฟังก์ชัน generateUniqueShortCode คืนค่าที่เรากำหนดได้ (deterministic)
// เพื่อให้ตรวจสอบได้แน่ชัดว่า service ส่งต่อค่าและบันทึกข้อมูลถูกต้อง
vi.mock("../../src/utils/shortcode", () => ({
  generateUniqueShortCode: vi.fn(),
}));

type Fn = ReturnType<typeof vi.fn>;
type PrismaMock = {
  url: {
    create: Fn;
    findUnique: Fn;
    findMany: Fn;
    count: Fn;
    update: Fn;
    deleteMany: Fn;
  };
};

const prisma = (prismaModule as unknown as { default: PrismaMock }).default;
const generateUniqueShortCode = (
  shortcodeModule as unknown as { generateUniqueShortCode: Fn }
).generateUniqueShortCode;

// ฟังก์ชันตัวช่วยสร้างข้อมูลจำลองของโมเดล URL
// พารามิเตอร์:
// - id: หมายเลขไอดีของเรคคอร์ด
// - overrides: ระบุฟิลด์ที่อยากเขียนทับค่าเริ่มต้นได้
// คืนค่า: อ็อบเจ็กต์ที่เหมือนเรคคอร์ดในฐานข้อมูล
function sampleModel(
  id: number,
  overrides: Partial<{
    originalUrl: string;
    shortCode: string;
    clickCount: number;
    lastAccessed: Date | null;
    createdAt: Date;
  }> = {}
) {
  return {
    id,
    originalUrl: overrides.originalUrl ?? "https://example.com",
    shortCode: overrides.shortCode ?? `code${id}`,
    clickCount: overrides.clickCount ?? 0,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: new Date(),
    lastAccessed: overrides.lastAccessed ?? null,
  };
}

describe("urlService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /*
   เทสต์: createUrl should create with generated short code
   ขั้นตอน:
   - Arrange: สั่งให้ generateUniqueShortCode คืนค่า "abc1234" และ prisma.url.create คืนเรคคอร์ดที่มี shortCode เดียวกัน
   - Act: เรียก createUrl ด้วย originalUrl ที่กำหนด
   - Assert: ตรวจสอบว่าเรียก generateUniqueShortCode(ไม่มี custom) เรียก prisma.url.create ด้วย payload ถูกต้อง และผลลัพธ์มี shortCode ตรงตามคาด
  */
  it("createUrl should create with generated short code", async () => {
    generateUniqueShortCode.mockResolvedValueOnce("abc1234");
    prisma.url.create.mockResolvedValueOnce(
      sampleModel(1, { shortCode: "abc1234" })
    );

    const result = await createUrl({ originalUrl: "https://example.com" });

    expect(generateUniqueShortCode).toHaveBeenCalledWith(undefined);
    expect(prisma.url.create).toHaveBeenCalledWith({
      data: { originalUrl: "https://example.com", shortCode: "abc1234" },
    });
    expect(result.shortCode).toBe("abc1234");
  });

  /*
   เทสต์: getUrlById should parse id and call prisma
   ขั้นตอน:
   - Arrange: ให้ prisma.url.findUnique คืนเรคคอร์ดเมื่อ where.id = 2
   - Act: ส่งค่า id เป็นสตริง "2" ให้ service แปลงเป็น number
   - Assert: ตรวจสอบว่าเรียก findUnique ด้วย where.id = 2 และผลลัพธ์มี id = 2
  */
  it("getUrlById should parse id and call prisma", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(
      sampleModel(2, { shortCode: "xyz7890", originalUrl: "https://x.test" })
    );

    const res = await getUrlById("2");

    expect(prisma.url.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(res?.id).toBe(2);
  });

  /*
   เทสต์: getUrlByShortCode should call prisma with shortCode
   ขั้นตอน:
   - Arrange: ให้ prisma.url.findUnique คืนเรคคอร์ดที่ shortCode = "shorty"
   - Act: เรียก getUrlByShortCode("shorty")
   - Assert: where.shortCode ถูกต้อง และผลลัพธ์มี shortCode ตรงกัน
  */
  it("getUrlByShortCode should call prisma with shortCode", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(
      sampleModel(7, { shortCode: "shorty" })
    );
    const res = await getUrlByShortCode("shorty");
    expect(prisma.url.findUnique).toHaveBeenCalledWith({
      where: { shortCode: "shorty" },
    });
    expect(res?.shortCode).toBe("shorty");
  });

  /*
   เทสต์: listUrls should paginate correctly
   ขั้นตอน:
   - Arrange: ให้ findMany คืน 1 รายการ และ count คืน 10 รวมทั้งหมด
   - Act: ขอหน้า 1 ขนาด 1 (page=1, limit=1)
   - Assert: เช็คว่า skip/take/orderBy ถูกต้อง และผลลัพธ์รวม/จำนวนรายการตรงตามคาด
  */
  it("listUrls should paginate correctly", async () => {
    prisma.url.findMany.mockResolvedValueOnce([
      sampleModel(3, { shortCode: "aaa0001", originalUrl: "https://a" }),
    ]);
    prisma.url.count.mockResolvedValueOnce(10);

    const out = await listUrls(1, 1);
    expect(prisma.url.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 1,
      orderBy: { id: "desc" },
    });
    expect(out.total).toBe(10);
    expect(out.items.length).toBe(1);
  });

  /*
   เทสต์: updateUrl should check customCode conflict and update
   ขั้นตอน:
   - Arrange: จำลองว่าไม่พบโค้ดซ้ำ (findUnique -> null), ให้ generateUniqueShortCode คืน "newcode",
              และ update สำเร็จโดยรีเทิร์นเรคคอร์ดที่มี shortCode เป็น "newcode"
   - Act: เรียก updateUrl โดยส่ง customCode: "newcode"
   - Assert: ตรวจสอบการเรียก findUnique, generateUniqueShortCode และ update ว่าอาร์กิวเมนต์ถูกต้อง และผลลัพธ์มี shortCode ตามคาด
  */
  it("updateUrl should check customCode conflict and update", async () => {
    prisma.url.findUnique.mockResolvedValueOnce(null); // no conflict
    generateUniqueShortCode.mockResolvedValueOnce("newcode");
    prisma.url.update.mockResolvedValueOnce(
      sampleModel(4, { shortCode: "newcode", originalUrl: "https://n" })
    );

    const updated = await updateUrl("4", { customCode: "newcode" });
    expect(prisma.url.findUnique).toHaveBeenCalledWith({
      where: { shortCode: "newcode" },
    });
    expect(generateUniqueShortCode).toHaveBeenCalledWith("newcode");
    expect(prisma.url.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { customCode: "newcode" },
    });
    expect(updated.shortCode).toBe("newcode");
  });

  /*
   เทสต์: deleteUrl should be idempotent
   ขั้นตอน:
   - Arrange: ให้ deleteMany คืน count=0 (ไม่มีอะไรถูกลบก็ไม่ถือว่า error)
   - Act & Assert: เรียกแล้วไม่ throw และ resolve เป็น undefined พร้อมตรวจสอบ where.id แปลงเป็น number แล้ว
  */
  it("deleteUrl should be idempotent", async () => {
    prisma.url.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(deleteUrl("999")).resolves.toBeUndefined();
    expect(prisma.url.deleteMany).toHaveBeenCalledWith({ where: { id: 999 } });
  });

  /*
   เทสต์: incrementClick should update counter and lastAccessed
   ขั้นตอน:
   - Arrange: ให้ update คืนเรคคอร์ดที่ clickCount เพิ่มขึ้น และ lastAccessed เป็นเวลาปัจจุบัน
   - Act: เรียก incrementClick ด้วย shortCode
   - Assert: ตรวจสอบ payload ของ update และผลลัพธ์ clickCount ที่เพิ่มขึ้น
  */
  it("incrementClick should update counter and lastAccessed", async () => {
    const now = new Date();
    prisma.url.update.mockResolvedValueOnce(
      sampleModel(5, {
        shortCode: "sc",
        originalUrl: "https://e",
        clickCount: 1,
        createdAt: now,
        lastAccessed: now,
      })
    );
    const res = await incrementClick("sc");
    expect(prisma.url.update).toHaveBeenCalledWith({
      where: { shortCode: "sc" },
      data: { clickCount: { increment: 1 }, lastAccessed: expect.any(Date) },
    });
    expect(res.clickCount).toBe(1);
  });
});
