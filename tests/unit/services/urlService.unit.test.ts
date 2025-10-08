import { describe, it, expect, vi, beforeEach } from "vitest";
import * as prismaModule from "../../../src/lib/prisma";
import * as shortcodeModule from "../../../src/utils/shortcode";
import {
	createUrl,
	getUrlById,
	listUrls,
	updateUrl,
	deleteUrl,
	incrementClick,
	getUrlByShortCode,
} from "../../../src/services/urlService";

vi.mock("../../../src/lib/prisma", () => {
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

vi.mock("../../../src/utils/shortcode", () => ({
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

describe("services/urlService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createUrl: ควรสร้างเรคคอร์ดด้วย shortCode ที่ถูกสร้าง/ยืนยันแล้ว", async () => {
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

		it("getUrlById: แปลง id เป็น number และเรียก prisma ให้ถูกต้อง", async () => {
		prisma.url.findUnique.mockResolvedValueOnce(
			sampleModel(2, { shortCode: "xyz7890", originalUrl: "https://x.test" })
		);

		const res = await getUrlById("2");

		expect(prisma.url.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
		expect(res?.id).toBe(2);
	});

		it("getUrlByShortCode: เรียก prisma ด้วยเงื่อนไข shortCode", async () => {
		prisma.url.findUnique.mockResolvedValueOnce(
			sampleModel(7, { shortCode: "shorty" })
		);
		const res = await getUrlByShortCode("shorty");
		expect(prisma.url.findUnique).toHaveBeenCalledWith({
			where: { shortCode: "shorty" },
		});
		expect(res?.shortCode).toBe("shorty");
	});

		it("listUrls: แบ่งหน้าได้ถูกต้อง (skip/take/orderBy)", async () => {
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

		it("updateUrl: ตรวจสอบ customCode ซ้ำ และอัปเดตได้เมื่อไม่ซ้ำ", async () => {
		prisma.url.findUnique.mockResolvedValueOnce(null);
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

		it("deleteUrl: ลบแบบ idempotent (ไม่เจอไม่ถือว่า error)", async () => {
		prisma.url.deleteMany.mockResolvedValueOnce({ count: 0 });
		await expect(deleteUrl("999")).resolves.toBeUndefined();
		expect(prisma.url.deleteMany).toHaveBeenCalledWith({ where: { id: 999 } });
	});

		it("incrementClick: เพิ่มตัวนับคลิกและอัปเดต lastAccessed", async () => {
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

