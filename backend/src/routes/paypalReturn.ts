import { Router } from 'express'
import { z } from 'zod'
import type { DemoGate } from '../demoGate.js'
import { AppError, readInput } from '../errors.js'
import type { OrderStore } from '../orderStore.js'
import { payPalId, type OrderPayments } from '../paypal/orders.js'

const returnQuery = z.object({
  token: payPalId.optional(), PayerID: payPalId.optional(), cancelled: z.literal('1').optional(),
}).refine(value => value.cancelled || value.token)

export function paypalReturnRoutes(orders: OrderStore, payments: OrderPayments, gate: DemoGate, frontendUrl: string) {
  const captured = new Map<string, Promise<void>>()

  async function capture(id: string) {
    const order = orders.byPayPalId(id)
    if (order.status === 'CAPTURED' && order.paypal_capture_id) return
    if (order.status !== 'AWAITING_APPROVAL') {
      throw new AppError(409, 'ORDER_NOT_APPROVED', 'This order is unavailable for capture.')
    }
    try {
      orders.capture(id, await payments.capture(id, order.total_cents))
    } catch (error) {
      if (error instanceof AppError && error.code === 'CAPTURE_FAILED') orders.failCapture(id)
      throw error
    }
  }

  return Router().get('/paypal/return', async (req, res) => {
    const { token, cancelled } = readInput(returnQuery, req.query, 'A valid sandbox approval token is required.')
    if (!cancelled && token) {
      await gate.run(() => {
        const prior = captured.get(token)
        if (prior) return prior
        const pending = capture(token).finally(() => captured.delete(token))
        captured.set(token, pending)
        return pending
      })
    }
    res.redirect(303, new URL('/setup', frontendUrl).href)
  })
}
