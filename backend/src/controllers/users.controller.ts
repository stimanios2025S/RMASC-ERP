// ─── Users Controller — Database-backed portal users (synced across PCs) ──
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error.js'

// ─── Login (returns user + JWT) ──────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { loginId, password } = req.body
    if (!loginId || !password) {
      res.status(400).json({ error: 'Identifiant et mot de passe requis.' })
      return
    }

    const user = await prisma.portalUser.findUnique({ where: { loginId } })
    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' })
      return
    }

    res.json({
      userId: user.loginId,
      name: user.name,
      role: user.role,
      loggedInAt: new Date().toISOString(),
    })
  } catch (e) { next(e) }
}

// ─── List all users (for admin management) ────────────────────────────────
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.portalUser.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, loginId: true, name: true, role: true, canChangePassword: true },
    })
    res.json(users)
  } catch (e) { next(e) }
}

// ─── Update user name (admin only) ────────────────────────────────────────
export async function updateUserName(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name } = req.body
    if (!name || !name.trim()) throw new AppError(400, 'Le nom ne peut pas être vide.')

    const user = await prisma.portalUser.update({
      where: { id },
      data: { name: name.trim() },
    })
    res.json({ loginId: user.loginId, name: user.name, role: user.role })
  } catch (e) { next(e) }
}

// ─── Update admin credentials (admin only) ────────────────────────────────
export async function updateAdminCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentLoginId, currentPassword, newLoginId, newPassword } = req.body

    const admin = await prisma.portalUser.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new AppError(404, 'Admin introuvable.')
    if (admin.loginId !== currentLoginId || admin.password !== currentPassword) {
      throw new AppError(403, 'Identifiant ou mot de passe actuel incorrect.')
    }

    // Check new loginId uniqueness
    if (newLoginId !== currentLoginId) {
      const existing = await prisma.portalUser.findUnique({ where: { loginId: newLoginId } })
      if (existing) throw new AppError(409, 'Cet identifiant est déjà utilisé.')
    }

    const updated = await prisma.portalUser.update({
      where: { id: admin.id },
      data: { loginId: newLoginId, password: newPassword },
    })
    res.json({ loginId: updated.loginId, name: updated.name, role: updated.role })
  } catch (e) { next(e) }
}

// ─── Seed default users (called on first startup) ─────────────────────────
export async function seedUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await prisma.portalUser.count()
    if (count > 0) { res.json({ message: 'Users already seeded.', count }); return }

    const defaults = [
      { loginId: 'admin', password: 'admin123', name: 'Totok Michael', role: 'ADMIN', canChangePassword: true },
      { loginId: 'ingenieur1', password: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
      { loginId: 'ingenieur2', password: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
      { loginId: 'verificateur', password: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
      { loginId: 'production', password: 'production', name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
      { loginId: 'magasinier', password: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
    ]

    for (const u of defaults) {
      await prisma.portalUser.create({ data: u })
    }
    res.json({ message: 'Default users seeded.', count: defaults.length })
  } catch (e) { next(e) }
}
