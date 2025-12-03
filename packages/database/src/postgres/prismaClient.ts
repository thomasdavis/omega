/**
 * Prisma Client Singleton
 * Ensures a single Prisma Client instance across the application
 */

import { PrismaClient } from '@prisma/client';

// Global variable to cache Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with logging configuration
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Cache Prisma Client in development to prevent creating multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Get Prisma Client instance
 * @returns Prisma Client singleton
 */
export function getPrismaClient(): PrismaClient {
  return prisma;
}

/**
 * Disconnect Prisma Client
 * Useful for cleanup in serverless environments
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Connect Prisma Client
 * Explicitly connect to the database
 */
export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}
