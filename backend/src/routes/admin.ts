import { Router } from 'express'
import type { DemoGate } from '../demoGate.js'
import type { DemoSeed } from '../seed/seed.js'
import { requireNoBody } from './input.js'

export function adminRoutes(seed: DemoSeed, gate: DemoGate) {
  return Router()
    .post('/admin/seed', async (req, res) => {
      requireNoBody(req.body)
      res.json({ orders: await gate.run(seed.seed) })
    })
    .post('/admin/reset', async (req, res) => {
      requireNoBody(req.body)
      res.json({ orders: await gate.reset(seed.reset) })
    })
}
