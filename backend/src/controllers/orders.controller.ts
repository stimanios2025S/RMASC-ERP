// ─── Orders Controller ──────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express'
import { createOrderSchema, validateOrderPayload, OrderValidationError } from '../schemas/orders.schema.js'
import * as ordersService from '../services/orders.service.js'

// POST /api/orders
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Zod schema validation
    const parsed = createOrderSchema.parse(req.body)

    // 2. Conditional validation: sous_type_electrique required if ÉLECTRIQUE
    validateOrderPayload(parsed)

    // 3. Business logic
    const order = await ordersService.createOrder(parsed)

    res.status(201).json({
      message: 'Commande créée avec succès.',
      order,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await ordersService.getOrderById(req.params.id)
    res.json({ order })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders
export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await ordersService.listOrders()
    res.json(orders)
  } catch (err) {
    next(err)
  }
}
