// ─── RMASC FACTORY — Users Controller ───────────────────────────────────
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import PortalUser from '../models/PortalUser.js'
import { loginSchema, changePasswordSchema, changeAdminCredentialsSchema } from '../schemas/validation.js'

const JWT_SECRET = process.env.JWT_SECRET
const BCRYPT_ROUNDS = 12

const DEFAULT_USERS = [
  { loginId: 'salim', password: 'salim123', name: 'Salim', role: 'ADMIN', canChangePassword: true },
  { loginId: 'chergui_ghani', password: 'chergui123', name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
  { loginId: 'chergui_nassim', password: 'chergui123', name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
  { loginId: 'chergui_said', password: 'chergui123', name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
  { loginId: 'chergui_aziz', password: 'chergui123', name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
  { loginId: 'ingenieur1', password: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
  { loginId: 'ingenieur2', password: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
  { loginId: 'verificateur', password: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
  { loginId: 'production', password: 'production', name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
  { loginId: 'magasinier', password: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
]

async function hashDefaults() {
  return Promise.all(DEFAULT_USERS.map(async u => ({
    ...u,
    password: await bcrypt.hash(u.password, BCRYPT_ROUNDS),
  })))
}

// POST /api/users/login
export async function login(req, res) {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const { loginId, password } = parsed.data
    const user = await PortalUser.findOne({ loginId })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const token = jwt.sign({ userId: user.loginId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ userId: user.loginId, name: user.name, role: user.role, token, loggedInAt: new Date().toISOString() })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/users/seed
export async function seedUsers(_req, res) {
  try {
    if (await PortalUser.countDocuments() > 0) return res.json({ message: 'Déjà initialisé.' })
    const defaults = await hashDefaults()
    await PortalUser.insertMany(defaults)
    res.json({ message: 'Utilisateurs créés.', count: defaults.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/users/fix-passwords
export async function fixPasswords(_req, res) {
  try {
    const all = await PortalUser.find({}).select('_id password').lean()
    let fixed = 0
    for (const u of all) {
      if (!u.password) continue
      if (typeof u.password === 'string' && (
        u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$')
      )) continue
      await PortalUser.findByIdAndUpdate(u._id, { password: await bcrypt.hash(u.password, BCRYPT_ROUNDS) })
      fixed++
    }
    const remaining = await PortalUser.countDocuments()
    res.json({ message: `${fixed} mot(s) de passe re-haché(s). ${remaining - fixed} déjà correct(s).`, totalUsers: remaining, fixed })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/users/reset-and-reseed
export async function resetAndReseed(_req, res) {
  try {
    await PortalUser.deleteMany({})
    const defaults = await hashDefaults()
    await PortalUser.insertMany(defaults)
    res.json({ message: '✅ Tous les utilisateurs réinitialisés.', count: defaults.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/users/seed-admins
export async function seedAdmins(_req, res) {
  try {
    const admins = [
      { loginId: 'chergui_ghani', name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_nassim', name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_said', name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_aziz', name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
    ]
    let created = 0
    for (const admin of admins) {
      const exists = await PortalUser.findOne({ loginId: admin.loginId })
      if (!exists) {
        await PortalUser.create({ ...admin, password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS) })
        created++
      }
    }
    res.json({ message: `${created} administrateur(s) créé(s).`, count: created })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/users
export async function listUsers(_req, res) {
  try {
    res.json(await PortalUser.find().select('loginId name role canChangePassword').sort({ name: 1 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PATCH /api/users/:id/name
export async function updateUserName(req, res) {
  try {
    res.json(await PortalUser.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true }).select('loginId name role'))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PUT /api/users/admin
export async function changeAdminCredentials(req, res) {
  try {
    const parsed = changeAdminCredentialsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const { currentLoginId, currentPassword, newLoginId, newPassword } = parsed.data
    const admin = await PortalUser.findOne({ loginId: currentLoginId })
    if (!admin) return res.status(404).json({ error: 'Administrateur introuvable.' })
    if (!currentPassword || !(await bcrypt.compare(currentPassword, admin.password))) {
      return res.status(403).json({ error: 'Mot de passe actuel incorrect.' })
    }
    const update = {}
    if (newLoginId) update.loginId = newLoginId
    if (newPassword) update.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await PortalUser.findByIdAndUpdate(admin._id, update)
    res.json({ success: true, message: 'Identifiants administrateur mis à jour.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PATCH /api/users/:id/password
export async function changeUserPassword(req, res) {
  try {
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const hashed = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS)
    await PortalUser.findByIdAndUpdate(req.params.id, { password: hashed })
    res.json({ success: true, message: 'Mot de passe mis à jour.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
