import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Satu koneksi Prisma dipakai ulang (hot reload di dev tidak membuat koneksi baru)
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global_.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") global_.prisma = prisma;
