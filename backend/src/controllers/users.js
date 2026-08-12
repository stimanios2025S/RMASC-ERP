// ─── RMASC FACTORY — Users Controller ───────────────────────────────────
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import PortalUser from '../models/PortalUser.js'
import { loginSchema, changePasswordSchema, changeAdminCredentialsSchema } from '../schemas/validation.js'

const JWT_SECRET = process.env.JWT_SECRET
const BCRYPT_ROUNDS = 12

// ⚠️  SÉCURITÉ : ces identifiants ont été ROTÉS (v2.7.9) — les anciens
// (salim/salim123, chergui123, ingenieur1, verificateur, production,
// production2, magasinier…) ne fonctionnent PLUS.
// `oldPassword` sert UNIQUEMENT à la rotation au démarrage : si le compte a
// encore l'ancien mot de passe par défaut → on le remplace. Si l'Admin a déjà
// changé le mot de passe manuellement → on respecte son choix.
const DEFAULT_USERS = [
  { loginId: 'salim.rmasc', password: 'Rm#Salim2026!', oldPassword: 'salim123', name: 'Salim', role: 'ADMIN', canChangePassword: true },
  { loginId: 'ghani.rmasc', password: 'Rm#Ghani2026!', oldPassword: 'chergui123', name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
  { loginId: 'nassim.rmasc', password: 'Rm#Nassim2026!', oldPassword: 'chergui123', name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
  { loginId: 'said.rmasc', password: 'Rm#Said2026!', oldPassword: 'chergui123', name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
  { loginId: 'aziz.rmasc', password: 'Rm#Aziz2026!', oldPassword: 'chergui123', name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
  { loginId: 'karim.be1', password: 'Rm#Karim2026!', oldPassword: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
  { loginId: 'yasmine.be2', password: 'Rm#Yasmine2026!', oldPassword: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
  { loginId: 'rachid.verif', password: 'Rm#Rachid2026!', oldPassword: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
  { loginId: 'said.prod1', password: 'Rm#Prod1_2026!', oldPassword: 'production', name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
  { loginId: 'chef.prod2', password: 'Rm#Prod2_2026!', oldPassword: 'production2', name: 'Chef Atelier 2', role: 'PRODUCTION_2', canChangePassword: false },
  { loginId: 'ahmed.mag', password: 'Rm#Ahmed2026!', oldPassword: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
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
    const admins = DEFAULT_USERS.filter(d => d.role === 'ADMIN')
    let created = 0
    for (const admin of admins) {
      const exists = await PortalUser.findOne({ loginId: admin.loginId })
      if (!exists) {
        await PortalUser.create({ ...admin, password: await bcrypt.hash(admin.password, BCRYPT_ROUNDS) })
        created++
      }
    }
    res.json({ message: `${created} administrateur(s) créé(s).`, count: created })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── Création auto du compte Atelier 2 (idempotent) ─────────────────────
// Fallback manuel via POST /api/users/ensure-production2.
// (La rotation rotateCredentials() couvre ce compte au démarrage.)
export async function ensureProduction2User() {
  const prod2 = DEFAULT_USERS.find(d => d.role === 'PRODUCTION_2')
  const exists = await PortalUser.findOne({ loginId: prod2.loginId }).select('_id').lean()
  if (exists) return { created: false }
  await PortalUser.create({
    loginId: prod2.loginId,
    password: await bcrypt.hash(prod2.password, BCRYPT_ROUNDS),
    name: prod2.name,
    role: prod2.role,
    canChangePassword: prod2.canChangePassword,
  })
  return { created: true }
}

// POST /api/users/ensure-production2 (route admin — fallback manuel)
export async function ensureProduction2(_req, res) {
  try {
    const result = await ensureProduction2User()
    res.json(result.created
      ? { message: '✅ Compte Atelier 2 créé.', created: true }
      : { message: 'Compte Atelier 2 déjà présent.', created: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── Rotation des identifiants (v2.7.9 — sécurité) ────────────────────────
// Appelée au démarrage du serveur. Pour chaque compte par défaut :
//   • Compte absent      → créé avec les nouveaux identifiants
//   • Mot de passe encore = ancien défaut → rotation (nouvel ID + nouveau MDP)
//   • Mot de passe changé manuellement (Admin) → respecté, rien d'écrasé
// Idempotente : relancer plusieurs fois ne casse rien.
export async function rotateCredentials() {
  let created = 0, rotated = 0, kept = 0
  for (const d of DEFAULT_USERS) {
    const existing = await PortalUser.findOne({ $or: [{ loginId: d.loginId }, { name: d.name }] })
    if (!existing) {
      await PortalUser.create({
        loginId: d.loginId,
        password: await bcrypt.hash(d.password, BCRYPT_ROUNDS),
        name: d.name,
        role: d.role,
        canChangePassword: d.canChangePassword,
      })
      created++
      continue
    }
    // Toujours sur l'ancien mot de passe par défaut → on applique la rotation
    const stillOldDefault = existing.password && await bcrypt.compare(d.oldPassword, existing.password).catch(() => false)
    if (stillOldDefault) {
      existing.loginId = d.loginId
      existing.password = await bcrypt.hash(d.password, BCRYPT_ROUNDS)
      existing.role = d.role
      existing.canChangePassword = d.canChangePassword
      await existing.save()
      rotated++
    } else {
      kept++ // mot de passe déjà changé manuellement → respecté
    }
  }
  return { created, rotated, kept }
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
