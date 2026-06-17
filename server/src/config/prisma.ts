import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient. Replaces the old Firebase Admin SDK init.
// In dev (tsx watch), reuse a global instance to avoid exhausting connections
// across hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
