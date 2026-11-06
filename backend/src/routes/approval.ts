import { Router } from 'express'
import type { DemoGate } from '../demoGate.js'
import { readInput } from '../errors.js'
import type { RefundService } from '../refundService.js'
import { requireNoBody, routeId } from './input.js'

export function approvalRoutes(refunds: RefundService, gate: DemoGate) {
  return Router()
    .get('/recalls/:id/plan', (req, res) => {
      const id = readInput(routeId, req.params.id)
      res.json({ plan: refunds.plan(id) })
    })
    .post('/recalls/:id/approve', async (req, res) => {
      const id = readInput(routeId, req.params.id)
      requireNoBody(req.body)
      res.json(await gate.run(() => refunds.approve(id)))
    })
}
