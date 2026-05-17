import { PrismaClient } from "@prisma/client";

// Prisma v7 with Accelerate/Data Proxy
// In Vercel serverless, globalThis persists across warm starts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // For Prisma Data Proxy / Accelerate connections
    accelerateUrl: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});