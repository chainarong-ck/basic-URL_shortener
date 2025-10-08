import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ตัวแปรช่วยสำหรับควบคุม mock ของ HTTP server และการ listen
type ServerListeners = Record<string, Array<(...args: unknown[]) => void>>;
type MockFn = ReturnType<typeof vi.fn>;
type ServerLike = {
  on: MockFn;
  emit: MockFn;
  close: MockFn;
  closeAllConnections: MockFn;
  // เฉพาะภายในเทสต์: ใช้อ่าน listener ที่ลงทะเบียนไว้
  _listeners: ServerListeners;
};

let lastServerMock: ServerLike | null = null; // อ้างอิง server mock ล่าสุด
let listenShouldThrow = false; // ใช้จำลองกรณี listen ล้มเหลวแบบ synchronous

// Mock app.listen เพื่อไม่ให้เปิดพอร์ตจริง และให้เข้าถึง/กระตุ้น server events ได้
vi.mock("../../src/app", () => {
  const makeServerMock = (): ServerLike => {
    const listeners: ServerListeners = {};
    const serverMock: ServerLike = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        (listeners[event] ||= []).push(handler);
      }),
      emit: vi.fn((event: string, ...args: unknown[]) => {
        for (const h of listeners[event] || []) h(...args);
      }),
      close: vi.fn((cb?: (err?: Error) => void) => {
        // พฤติกรรมปกติ: ปิดสำเร็จ -> callback โดยไม่มี error
        if (cb) cb();
      }),
      closeAllConnections: vi.fn(),
      _listeners: listeners,
    };
    lastServerMock = serverMock;
    return serverMock;
  };

  return {
    default: {
      listen: vi.fn((_port: number, cb: () => void) => {
        if (listenShouldThrow) throw new Error("listen fail");
        cb();
        return makeServerMock();
      }),
      emit: vi.fn(),
      on: vi.fn(),
    },
  };
});

// ปิดเสียง logger ระหว่างทดสอบ แต่ยังตรวจสอบการเรียกใช้งานได้
vi.mock("../../src/utils/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// ผู้ช่วย: ลบ process listeners เดิมออกเพื่อไม่ให้ทับซ้อนข้ามเคส
function clearProcessListeners() {
  for (const evt of [
    "SIGINT",
    "SIGTERM",
    "SIGQUIT",
    "SIGHUP",
    "uncaughtException",
    "unhandledRejection",
    "disconnect",
  ] as const) {
    process.removeAllListeners(evt);
  }
}

// ผู้ช่วย: นำเข้า server ใหม่ทุกครั้ง หลังรีเซ็ตโมดูลและ listeners
async function freshImport() {
  vi.resetModules();
  clearProcessListeners();
  // การตั้งค่า ENV ขั้นต่ำ
  process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
  process.env.APP_PORT = "3000";
  await import("../../src/server");
}

// ผู้ช่วย: mock process.exit ให้ไม่ออกจริง แต่ยังสามารถตรวจการเรียกได้
function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation(((
    _code?: string | number | null | undefined
  ) => {
    // no-op เพื่อไม่ให้ process ออกจริงในระหว่างทดสอบ
  }) as unknown as (code?: string | number | null | undefined) => never);
}

describe("server bootstrap", () => {
  beforeEach(() => {
    // ตั้งค่า ENV ขั้นต่ำที่จำเป็น และเคลียร์ mocks ต่างๆ
    process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
    process.env.APP_PORT = "3000"; // จำนวนบวกใดก็ได้
    listenShouldThrow = false;
    lastServerMock = null;
    vi.resetModules();
    clearProcessListeners();
  });
  afterEach(() => {
    // รีเซ็ตตัวตั้งเวลาและ listeners เพื่อไม่ให้มีผลข้างเคียง
    vi.useRealTimers();
    clearProcessListeners();
  });

  it("import ได้โดยไม่ได้รับ throw และตั้ง listeners สำเร็จ", async () => {
    await freshImport();
    expect(lastServerMock).toBeTruthy();
    // ต้องลงทะเบียน event: error และ connection เป็นอย่างน้อย
    expect(lastServerMock!._listeners["error"]).toBeTruthy();
    expect(lastServerMock!._listeners["connection"]).toBeTruthy();
  });

  it("เมื่อได้รับ event on error", async () => {
    await freshImport();
    const logger = (await import("../../src/utils/logger")).default;
    const err = new Error("boom");
    // กระตุ้น handler ผ่าน emit
    lastServerMock!.emit("error", err);
    expect(logger.error).toHaveBeenCalledWith(err, "HTTP server error");
  });

  it("เมื่อได้รับ event on connection", async () => {
    await freshImport();
    // จำลอง socket ที่เข้ามาใหม่ และตรวจว่าได้ลงทะเบียน 'close' บน socket
    const socket: { on: MockFn; destroy: MockFn } = {
      on: vi.fn(),
      destroy: vi.fn(),
    };
    lastServerMock!.emit("connection", socket);
    expect(socket.on).toHaveBeenCalledWith("close", expect.any(Function));
    // กระตุ้น close ของ socket เพื่อคอนเฟิร์มว่าคอลแบ็คเรียกได้โดยไม่ throw
    const calls = (socket.on as MockFn).mock.calls as unknown as Array<
      unknown[]
    >;
    const entry = calls.find((c) => c[0] === "close") as
      | [string, (...args: unknown[]) => void]
      | undefined;
    const closeHandler = entry?.[1];
    expect(closeHandler).toBeTypeOf("function");
    expect(() => closeHandler && closeHandler()).not.toThrow();
  });

  it("เมื่อได้รับ event on close", async () => {
    // ทดสอบผ่านเส้นทาง shutdown: server.close callback -> logger.info("HTTP server closed")
    const exitSpy = mockProcessExit();
    await freshImport();
    const logger = (await import("../../src/utils/logger")).default;
    process.emit("SIGINT" as NodeJS.Signals);
    expect(lastServerMock!.close).toHaveBeenCalled();
    expect(lastServerMock!.closeAllConnections).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("HTTP server closed");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("ปิดอย่างถูกต้องเมื่อได้รับสัญญาณ SIGINT, SIGTERM, SIGQUIT, SIGHUP, disconnect", async () => {
    const exitSpy = mockProcessExit();

    const triggerAndAssert = async (
      signal: "SIGINT" | "SIGTERM" | "SIGQUIT" | "SIGHUP" | "disconnect"
    ) => {
      await freshImport();
      exitSpy.mockClear();
      lastServerMock!.closeAllConnections.mockClear();
      lastServerMock!.close.mockClear();
      type LoggerMock = {
        info: MockFn;
        warn: MockFn;
        debug: MockFn;
        error: MockFn;
      };
      const logger = (await import("../../src/utils/logger"))
        .default as unknown as LoggerMock;
      logger.info.mockClear();
      logger.debug.mockClear();
      if (signal === "disconnect") {
        process.emit("disconnect");
      } else {
        process.emit(signal as NodeJS.Signals);
      }
      expect(lastServerMock!.close).toHaveBeenCalledTimes(1);
      expect(lastServerMock!.closeAllConnections).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        { signal },
        "Received signal, shutting down gracefully"
      );
      expect(logger.info).toHaveBeenCalledWith("HTTP server closed");
      expect(exitSpy).toHaveBeenCalledWith(0);
    };

    await triggerAndAssert("SIGINT");
    await triggerAndAssert("SIGTERM");
    await triggerAndAssert("SIGQUIT");
    await triggerAndAssert("SIGHUP");
    await triggerAndAssert("disconnect");
  });

  it("ปิดอย่างถูกต้องเมื่อได้รับข้อผิดพลาด uncaughtException, unhandledRejection", async () => {
    const exitSpy = mockProcessExit();

    // uncaughtException
    await freshImport();
    let logger = (await import("../../src/utils/logger"))
      .default as unknown as { error: MockFn };
    process.emit("uncaughtException", new Error("oops"));
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      "Uncaught exception"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    // unhandledRejection
    await freshImport();
    logger = (await import("../../src/utils/logger")).default as unknown as {
      error: MockFn;
    };
    process.emit("unhandledRejection", "nope", Promise.resolve());
    expect(logger.error).toHaveBeenCalledWith(
      { reason: "nope" },
      "Unhandled rejection"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("ปิดอย่างถูกต้องเมื่อได้รับ throw", async () => {
    // กรณี start() ล้มเหลวทันทีระหว่าง listen -> try/catch ต้องจับและ exit(1)
    listenShouldThrow = true;
    const exitSpy = mockProcessExit();
    await freshImport();
    const logger = (await import("../../src/utils/logger"))
      .default as unknown as { error: MockFn };
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      "Failed to start server"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
