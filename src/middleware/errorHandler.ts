/**
 * Error & 404 handlers
 * เป้าหมาย: ทำให้รูปแบบ JSON ของ error มีความสม่ำเสมอ ง่ายต่อการ parse / ทำ observability
 * ควรหลีกเลี่ยงการเปิดเผย stack ภายนอก API (security) จึง log ภายในเท่านั้น
 */
import type { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function notFound(_req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: "Not Found" });
}

// Central error handler
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // บันทึก error ทั้งก้อน (หาก production อาจพิจารณา redaction ข้อมูลส่วนบุคคลถ้ามี)
  logger.error(err);

  const isErr = (
    e: unknown
  ): e is { message?: string; name?: string; errors?: unknown } =>
    typeof e === "object" && e !== null;

  if (isErr(err)) {
    // Mapping ข้อความ error ภายใน -> HTTP status + ข้อความสำหรับ client
    const map: Record<string, { status: number; error: string }> = {
      CUSTOM_CODE_CONFLICT: { status: 409, error: "customCode already exists" },
      SHORTCODE_GENERATION_FAILED: {
        status: 500,
        error: "Failed to generate unique shortCode",
      },
      INVALID_ID: { status: 400, error: "Invalid id parameter" },
    };
    if (err.message && map[err.message]) {
      const m = map[err.message];
      return res.status(m.status).json({ error: m.error });
    }
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Validation error", details: err.errors });
    }
  }
  res.status(500).json({ error: "Internal Server Error" });
}
