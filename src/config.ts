import dotenv from "dotenv";
import { z } from "zod";

// โหลด .env เข้ามา process.env
dotenv.config();

/**
 * Schema ตรวจสอบ Environment Variables (Production Grade)
 */
const EnvSchema = z.object({
  // Environment
  NODE_ENV: z.string().default("development"),
  // Application
  APP_PORT: z.coerce.number().int().positive().default(3_000),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  // Database (Prisma)
  DATABASE_URL: z.url(),
  // Logging
  LOG_LEVEL: z.string().optional().default("info"),
  TEST_VERBOSE_LOG: z.string().default("0"),
  // Graceful shutdown
  FORCE_EXIT_MS: z.coerce.number().int().positive().default(10_000),
  // CORS
  CORS_ORIGIN: z.string().default("*"),
  // Rate limit
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  // Redirect cache
  REDIRECT_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  REDIRECT_CACHE_MAX: z.coerce.number().int().positive().default(500),
  REDIRECT_CACHE_SWEEP_MS: z.coerce.number().int().positive().default(600_000),
});

/** ประมวลผล + แคช config */
export type AppConfig = z.infer<typeof EnvSchema>;
let cached: AppConfig | null = null;

/**
 * โหลดและ validate environment variables
 * @returns AppConfig ค่าที่ผ่านการตรวจสอบแล้ว
 */
export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // แสดงข้อผิดพลาดแบบ readable
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error("Invalid environment variables: " + issues);
  }
  cached = parsed.data;
  return cached;
}

export const config = loadConfig();
