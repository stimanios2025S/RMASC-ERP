// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — MongoDB Connection Pool (Vercel Serverless Safe)
//  Uses globalThis singleton to reuse connections across function invocations.
//  Prevents exceeding Atlas connection limits during cold starts.
// ═══════════════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/rmasc-erp'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required')
}

// ─── Global cache — survives Vercel function re-use ───────────────────────
const globalCache = globalThis

let cached = globalCache.__rmascMongoose

if (!cached) {
  cached = globalCache.__rmascMongoose = {
    conn: null,
    promise: null,
  }
}

export async function connectDB() {
  // Return cached connection if already established
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  // If a connection attempt is in progress, wait for it
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,        // Limit connections for Vercel/serverless
      minPoolSize: 1,
      maxIdleTimeMS: 60000,  // Close idle connections quickly
      bufferCommands: false, // Don't buffer commands when disconnected
    })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (err) {
    // Reset promise so next invocation can retry
    cached.promise = null
    cached.conn = null
    throw err
  }
}

export async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  } catch {
    // Best effort — Vercel kills the process anyway
  }
  cached.conn = null
  cached.promise = null
}

export async function testDBConnection() {
  const start = Date.now()
  try {
    await connectDB()
    await mongoose.connection.db?.admin().ping()
    return { connected: true, latencyMs: Date.now() - start }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { connected: false, latencyMs: Date.now() - start, error: message }
  }
}

export default mongoose
