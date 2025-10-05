import app from "./app";
import { config } from "./config";
import logger from "./utils/logger";
import type { Socket } from "node:net";

/**
 * เริ่มต้นเซิร์ฟเวอร์ + จัดการ graceful shutdown
 */
async function start(): Promise<void> {
  try {
    // เริ่มเซิร์ฟเวอร์
    const server = app.listen(config.APP_PORT, () => {
      logger.info(
        { port: config.APP_PORT, env: config.NODE_ENV },
        "Server listening"
      );
    });
    app.emit("ready");

    // จัดการ error จาก HTTP server
    server.on("error", (err: Error) => {
      logger.error(err, "HTTP server error");
    });

    // ติดตามซ็อกเก็ตที่ใช้งานอยู่เพื่อให้แน่ใจว่าสามารถทำลายเมื่อปิดเครื่องได้หากจำเป็น
    const sockets = new Set<Socket>();
    server.on("connection", (socket: Socket) => {
      sockets.add(socket);
      socket.on("close", () => {
        sockets.delete(socket);
      });
    });

    // หลีกเลี่ยงการปิดเครื่องหลายครั้ง
    let shuttingDown = false;
    const shutdown = async (signal: string, code = 0) => {
      if (shuttingDown) {
        logger.warn({ signal }, "Shutdown already in progress");
        return;
      }
      shuttingDown = true;
      logger.debug({ signal }, "Received signal, shutting down gracefully");

      // ตั้งตัวจับเวลาเพื่อบังคับออกหากปิดไม่เสร็จ
      const forceTimer = setTimeout(() => {
        logger.error(
          { ms: config.FORCE_EXIT_MS },
          "Force exiting after timeout"
        );
        for (const s of sockets) {
          try {
            s.destroy();
          } catch {}
        }
        process.exit(Math.max(code, 1));
      }, config.FORCE_EXIT_MS).unref();

      // ปิดเซิร์ฟเวอร์และออกเมื่อเสร็จสิ้น
      server.close((err?: Error) => {
        clearTimeout(forceTimer);
        if (err) {
          logger.error(err, "Error closing HTTP server");
        } else {
          logger.info("HTTP server closed");
        }
        process.exit(err ? 1 : code);
      });

      // ปิดการเชื่อมต่อทั้งหมดที่เชื่อมต่อกับเซิร์ฟเวอร์นี้
      server.closeAllConnections();
    };
    
    // จัดการสัญญาณการปิด
    process.once("SIGINT", () => void shutdown("SIGINT", 0));
    process.once("SIGTERM", () => void shutdown("SIGTERM", 0));
    process.once("SIGQUIT", () => void shutdown("SIGQUIT", 0));
    process.once("SIGHUP", () => void shutdown("SIGHUP", 0));

    // ความผิดพลาดรุนแรง => log แล้วปิดให้สุภาพ จากนั้นออกด้วยโค้ด 1
    process.on("uncaughtException", (err: Error) => {
      logger.error(err, "Uncaught exception");
      void shutdown("uncaughtException", 1);
    });
    process.on("unhandledRejection", (reason: unknown) => {
      logger.error({ reason }, "Unhandled rejection");
      void shutdown("unhandledRejection", 1);
    });

    // ถูกตัด IPC จากพาเรนต์ (เช่นรันเป็น child process/PM2)
    process.on("disconnect", () => void shutdown("disconnect", 0));
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

start();
