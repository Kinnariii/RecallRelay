import { Router } from 'express'
import type { DemoGate } from '../demoGate.js'
import { readInput } from '../errors.js'
import type { RefundService } from '../refundService.js'
import { requireNoBody, routeId } from './input.js'

export function refundRoutes(refunds: RefundService, gate: DemoGate) {
  return Router()
    .get('/recalls/:id/refunds', async (req, res) => {
      const id = readInput(routeId, req.params.id)
      res.json({ refunds: await gate.run(() => refunds.list(id)) })
    })
    .post('/recalls/:id/refunds/:orderId/retry', async (req, res) => {
      const id = readInput(routeId, req.params.id)
      const orderId = readInput(routeId, req.params.orderId)
      requireNoBody(req.body)
      res.json({ refund: await gate.run(() => refunds.retry(id, orderId)) })
    })
}
