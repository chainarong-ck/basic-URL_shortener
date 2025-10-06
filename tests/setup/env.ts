// ตรวจสอบให้แน่ใจว่ามีการโหลด. env สำหรับสภาพแวดล้อมการทดสอบ
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

//  ตั้งค่า NODE_ENV เป็น 'test' หากยังไม่ได้ตั้งค่า
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
