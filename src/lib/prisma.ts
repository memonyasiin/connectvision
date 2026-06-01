// ─────────────────────────────────────────────────────────────────────────────
// Prisma client singleton (Tier 4 — multi-tenant DB core)
// ─────────────────────────────────────────────────────────────────────────────
// In dev, Next.js hot-reload re-evaluates server modules on every code edit.
// Naively constructing `new PrismaClient()` per evaluation leaks DB
// connections until MySQL exhausts max_connections. The fix: stash the
// instance on `globalThis` so subsequent evaluations reuse it.
//
// In prod the module is loaded exactly once per server boot, so the global
// stash is a no-op (and avoided to keep memory usage tight).

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __cv_prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
  });
}

export const prisma: PrismaClient = globalThis.__cv_prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cv_prisma = prisma;
}
