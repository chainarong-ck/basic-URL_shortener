import dotenv from "dotenv";
import { z } from "zod";

// โหลด .env เข้ามา process.env
dotenv.config();

/**
 * Schema ตรวจสอบ Environment Variables (Production Grade)
 */
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().optional(),
  TEST_VERBOSE_LOG: z.string().default("0"),
  FORCE_EXIT_MS: z.coerce.number().int().positive().default(10000),
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
