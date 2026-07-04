// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — MongoDB Connection Pool + Global JSON Transform
//  - Global `toJSON` transform: maps `_id` → `id` for every model
//  - Prevents the `id` vs `_id` bug that breaks ALL frontend CRUD operations
// ═══════════════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose'
import { Schema } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/rmasc-erp'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required')
}

// ─── Global Plugin: auto-map _id → id in JSON responses ────────────────
// This ensures every Mongoose document returned via res.json() includes
// an `id` field matching the MongoDB _id, exactly like Prisma did.
mongoose.plugin(function setIdPlugin(schema) {
  // Only add if not already present
  if (!schema.paths['id']) {
    schema.virtual('id').get(function () {
      return this._id?.toString()
    })
  }

  // Ensure virtuals are included in JSON
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id?.toString()
      return ret
    },
  })

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id?.toString()
      return ret
    },
  })
})

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
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (err) {
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
  } catch {}
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
