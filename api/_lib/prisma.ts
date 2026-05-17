import { PrismaClient } from "@prisma/client";

// Lazy init for Vercel serverless cold starts
let prisma: PrismaClient;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      // Use direct database URL (not Data Proxy URL) for serverless functions
      datasources: {
        db: {
          url: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}
