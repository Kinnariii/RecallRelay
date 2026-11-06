import { Router } from 'express'
import type { OrderStore } from '../orderStore.js'

export function orderRoutes(orders: OrderStore) {
  return Router().get('/orders', (_req, res) => res.json({ orders: orders.list() }))
}
