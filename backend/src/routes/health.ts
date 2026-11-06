import { Router } from 'express'

export const healthRoutes = Router().get('/health', (_req, res) => {
  res.json({ ok: true })
})
