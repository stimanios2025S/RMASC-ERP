// ─── RMASC FACTORY — MongoDB Connection (Mongoose) ──────────────────────
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/rmasc-erp'

let cached = globalThis.__rmascMongoose
if (!cached) {
  cached = globalThis.__rmascMongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
  }

  try {
    cached.conn = await cached.promise
    console.log(`  ✅ MongoDB connectée: ${mongoose.connection.host}`)
  } catch (err) {
    cached.promise = null
    console.warn(`  ⚠️  MongoDB: ${err.message}`)
    throw err
  }

  return cached.conn
}

export async function disconnectDB() {
  try { await mongoose.disconnect() } catch {}
}

export async function testDBConnection() {
  const start = Date.now()
  try {
    await mongoose.connection.db?.admin().ping()
    return { connected: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { connected: false, latencyMs: Date.now() - start, error: err.message }
  }
}

export default mongoose
