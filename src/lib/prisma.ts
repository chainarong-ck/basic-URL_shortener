/**
 * Prisma Client singleton initialization.
 * Ensures that during development & test we don't create multiple instances which
 * could exhaust database connections or lead to schema re-generation overhead.
 */
import { PrismaClient } from "../../generated/prisma";
import { config } from "../config";

const globalForPrisma = globalThis as unknown as {
  __PRISMA__: PrismaClient;
};

const prisma = globalForPrisma.__PRISMA__ ?? new PrismaClient();

if (config.NODE_ENV === "test") {
  // Reuse a single Prisma instance in the test environment (Jest reloads modules)
  globalForPrisma.__PRISMA__ = prisma;
}

export default prisma;
