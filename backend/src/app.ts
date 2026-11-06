import cors from 'cors'
import express from 'express'
import { createModel, type ModelCall } from './ai/model.js'
import type { Config } from './config.js'
import type { Db } from './db.js'
import { createDemoGate } from './demoGate.js'
import { errorHandler, notFound } from './errors.js'
import { checkMutation, rateLimit, requestLog } from './middleware.js'
import { createOrderStore } from './orderStore.js'
import { createRecallStore } from './recallStore.js'
import { createPayPalClient } from './paypal/client.js'
import { createOrderPayments } from './paypal/orders.js'
import { createRefundPayments } from './paypal/refunds.js'
import { createRefundService } from './refundService.js'
import { createRefundStore } from './refundStore.js'
import { adminRoutes } from './routes/admin.js'
import { approvalRoutes } from './routes/approval.js'
import { healthRoutes } from './routes/health.js'
import { orderRoutes } from './routes/orders.js'
import { paypalReturnRoutes } from './routes/paypalReturn.js'
import { recallRoutes } from './routes/recalls.js'
import { refundRoutes } from './routes/refunds.js'
import { createDemoSeed, loadCatalog } from './seed/seed.js'

export function createApp(config: Config, db: Db, dependencies: {
  paypalFetch?: typeof fetch; paypalTimeoutMs?: number; model?: ModelCall; log?: (message: string) => void
} = {}) {
  loadCatalog(db)
  const orders = createOrderStore(db)
  const paypal = createPayPalClient(config, dependencies.paypalFetch, dependencies.paypalTimeoutMs)
  const payments = createOrderPayments(paypal, config.BACKEND_URL)
  const gate = createDemoGate()
  const recalls = createRecallStore(db, orders)
  const refunds = createRefundService(db, orders, recalls, createRefundStore(db), createRefundPayments(paypal))

  const app = express()
  app.disable('x-powered-by')
  if (dependencies.log) app.use(requestLog(dependencies.log))
  app.use(cors({ origin: config.FRONTEND_URL, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type'] }))
  app.use(checkMutation(config.FRONTEND_URL))
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  app.post('/api/recalls/extract', rateLimit(8))
  app.post(['/api/recalls/:id/approve', '/api/recalls/:id/refunds/:orderId/retry'], rateLimit(30))
  app.use(express.json({ limit: '128kb', inflate: false }))
  app.use('/api', healthRoutes, adminRoutes(createDemoSeed(db, orders, payments), gate),
    orderRoutes(orders), paypalReturnRoutes(orders, payments, gate, config.FRONTEND_URL),
    recallRoutes(recalls, dependencies.model ?? createModel(config), gate), approvalRoutes(refunds, gate),
    refundRoutes(refunds, gate))
  app.use((_req, _res, next) => next(notFound('Endpoint')))
  app.use(errorHandler)
  return app
}
