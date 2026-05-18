import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const { Pool } = pg;

// Ambil URL Database dari environment Vercel
const connectionString = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  // 1. Buat kolam koneksi (pool) Postgres
  const pool = new Pool({ connectionString });
  
  // 2. Bungkus kolam tersebut ke dalam Prisma Adapter
  const adapter = new PrismaPg(pool);
  
  // 3. Masukkan adapter ke dalam Prisma Client (Syarat mutlak Prisma v7)
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
}

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;