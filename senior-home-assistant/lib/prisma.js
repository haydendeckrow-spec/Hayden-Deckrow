import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev so we don't open a
// new SQLite connection on every file change.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
