import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import urlRoutes from "./routes/urlRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { redirectShort } from "./controllers/urlController";
import { redirectCache } from "./middleware/cache";
import logger from "./utils/logger";
import { config } from "./config";

const app: Application = express();

// Body parser
app.use(express.json());

// CORS: ควรกำหนด origin ให้แคบลงใน production (config.CORS_ORIGIN)
// รองรับได้ทั้งรูปแบบตัวเดียว, "*", หรือหลายตัวคั่นด้วยคอมมา
const corsOriginSetting = (() => {
  const raw = config.CORS_ORIGIN.trim();
  if (raw === "*") return "*";
  // แยกคอมมาและกรองค่าว่าง
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
})();
app.use(cors({ origin: corsOriginSetting }));

// Helmet: เปิดใช้งาน header security พื้นฐาน (สามารถปรับละเอียดเพิ่ม CSP ได้ภายหลัง)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // อนุญาตโหลด static จากโดเมนเดียวกัน/ย่อย (ปรับได้ตาม use case)
  })
);

// Rate limiter api: จำกัดเฉพาะเส้นทาง /api
app.use("/api", apiLimiter);
app.use("/api", urlRoutes);

// Redirect short URL: ใช้ cache
app.get("/:shortCode", redirectCache, redirectShort);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

app.on("ready", () => {
  logger.info("App is ready");
});

export default app;
