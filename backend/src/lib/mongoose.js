// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — MongoDB Connection Pool (Production Hardened)
//  Retry logic, health monitoring, auto-reconnect, pool sizing
// ═══════════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/rmasc-erp'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required')
}

// ─── Global JSON transform ────────────────────────────────────────────────
mongoose.plugin(function setIdPlugin(schema) {
  if (!schema.paths['id']) {
    schema.virtual('id').get(function () { return this._id?.toString() })
  }
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) { ret.id = ret._id?.toString(); return ret },
  })
  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) { ret.id = ret._id?.toString(); return ret },
  })
})

// ─── Connection state ────────────────────────────────────────────────────
const MAX_RETRIES = 5
const RETRY_BASE_MS = 1000

let connectionPromise = null
let reconnectTimer = null

// ─── Connection events ────────────────────────────────────────────────────
mongoose.connection.on('connected', () => {
  console.log(`  ✅ MongoDB connectée — Pool: 20 connexions`)
})
mongoose.connection.on('disconnected', () => {
  console.warn(`  ⚠️  MongoDB déconnectée — tentative de reconnexion...`)
})
mongoose.connection.on('error', (err) => {
  console.error(`  ❌ MongoDB erreur: ${err.message}`)
})
mongoose.connection.on('reconnected', () => {
  console.log(`  ✅ MongoDB reconnectée`)
})

// ─── Connect with retry ───────────────────────────────────────────────────
export async function connectDB(retries = MAX_RETRIES) {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority',
    })
  }

  try {
    await connectionPromise
    return mongoose
  } catch (err) {
    connectionPromise = null
    if (retries > 0) {
      const delay = RETRY_BASE_MS * Math.pow(2, MAX_RETRIES - retries)
      console.warn(`  ⚠️  MongoDB échec — nouvelle tentative dans ${delay}ms (${retries} restantes)`)
      await new Promise(r => { reconnectTimer = setTimeout(r, delay) })
      return connectDB(retries - 1)
    }
    throw err
  }
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

export async function disconnectDB() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  connectionPromise = null
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  } catch {}
}

export default mongoose
