// ─── Global error handling middleware ──────────────────────────────────────
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400 with structured messages
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Erreur de validation des données.',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    })
    return
  }

  // Fallback — 500
  console.error('[UNHANDLED ERROR]', err)
  res.status(500).json({
    error: 'Erreur interne du serveur.',
  })
}
