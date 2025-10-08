import { describe, it, expect } from "vitest";

describe("lib/prisma singleton", () => {
  it("นำอินสแตนซ์เดียวในการทดสอบ", async () => {
    process.env.NODE_ENV = "test";
    const m1 = await import("../../../src/lib/prisma");
    const m2 = await import("../../../src/lib/prisma");
    expect(m1.default).toBe(m2.default);
  });
});
