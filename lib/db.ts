import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Apply SQLite PRAGMAs for concurrency
if (!globalForPrisma.prisma) {
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout = 30000;").catch(() => {});
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
