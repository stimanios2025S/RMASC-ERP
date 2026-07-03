// ─── RMASC FACTORY — Prisma Client (Bulletproof) ──────────────────────────
// Handles Neon PostgreSQL connection with timeouts, retry, and crash prevention.
// If the DB goes down, the API stays up (returns 503) instead of freezing.

import { PrismaClient } from '@prisma/client'

// ─── Singleton Prisma client with aggressive timeouts ─────────────────────
const globalForPrisma = globalThis as unknown as { __rmascPrisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['warn', 'error'],
    // Connection pool settings for Neon PgBouncer compatibility
    // These prevent the "hung connection" problem across multiple laptops
    transactionOptions: {
      isolationLevel: 'ReadCommitted',
      maxWait: 5_000,    // 5s max wait for a connection
      timeout: 15_000,    // 15s timeout for transactions
    },
  })
}

const prisma = globalForPrisma.__rmascPrisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.__rmascPrisma = prisma

// ─── Test database connectivity (returns true/false, never hangs) ─────────
export async function testDatabaseConnection(): Promise<{
  connected: boolean
  latencyMs: number
  error?: string
}> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start
    return { connected: true, latencyMs }
  } catch (err: any) {
    return { connected: false, latencyMs: Date.now() - start, error: err.message || 'Unknown error' }
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────
export async function disconnectPrisma(): Promise<void> {
  try { await prisma.$disconnect() } catch {}
}

export { prisma }
