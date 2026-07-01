// Phase 1 placeholder — kept import-free so the workspace installs without the
// Prisma engine. The schema (prisma/schema.prisma) is the real deliverable here.
//
// Phase 3 replaces this file with the standard Prisma singleton:
//
//   import { PrismaClient } from '@prisma/client';
//   const g = globalThis as unknown as { prisma?: PrismaClient };
//   export const prisma = g.prisma ?? new PrismaClient();
//   if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
//   export * from '@prisma/client';

export function prismaNotReady(): never {
  throw new Error('@orms/db is not wired yet — Prisma lands in Phase 3 of the migration.');
}
