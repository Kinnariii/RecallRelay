import { z } from 'zod'
import { AppError } from '../errors.js'
import { PayPalError, type PayPalClient } from './client.js'
import { usdAmount, usdResponse } from './money.js'

export const payPalId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const orderStatus = z.enum(['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED'])
const createdSchema = z.object({
  id: payPalId, status: orderStatus,
  links: z.array(z.object({ href: z.url(), rel: z.string(), method: z.string().optional() })),
})
const captureSchema = z.object({
  id: payPalId, status: orderStatus,
  purchase_units: z.array(z.object({
    payments: z.object({
      captures: z.array(z.object({
        id: payPalId,
        status: z.enum(['COMPLETED', 'PENDING', 'DECLINED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED']),
        amount: usdResponse,
      })).optional(),
    }).optional(),
  })).optional(),
})

function safeApprovalLink(href: string) {
  const url = new URL(href)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    (url.hostname === 'sandbox.paypal.com' || url.hostname.endsWith('.sandbox.paypal.com'))
}

export function createOrderPayments(client: PayPalClient, backendUrl: string) {
  return {
    async create(totalCents: number, requestId: string) {
      const callback = new URL('/api/paypal/return', backendUrl)
      const cancel = new URL(callback)
      cancel.searchParams.set('cancelled', '1')
      const order = await client.request('/v2/checkout/orders', createdSchema, {
        requestId,
        body: {
          intent: 'CAPTURE',
          purchase_units: [{ amount: usdAmount(totalCents) }],
          payment_source: { paypal: { experience_context: {
            return_url: callback.href, cancel_url: cancel.href,
            shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW',
          } } },
        },
      })
      const link = order.links.find(({ rel, href, method }) =>
        ['approve', 'payer-action'].includes(rel) && (!method || method === 'GET') && safeApprovalLink(href))
      if (!link) throw new PayPalError('response', 'request')
      return { id: order.id, approvalUrl: link.href }
    },
    async capture(id: string, totalCents: number) {
      const path = `/v2/checkout/orders/${encodeURIComponent(id)}` as const
      const order = await client.request(`${path}/capture`, captureSchema, {
        body: {}, requestId: `capture-${id}`,
      }).catch(error => {
        if (error instanceof PayPalError && error.issue === 'ORDER_ALREADY_CAPTURED') {
          return client.request(path, captureSchema)
        }
        if (error instanceof PayPalError && error.issue === 'ORDER_NOT_APPROVED') {
          throw new AppError(409, 'ORDER_NOT_APPROVED', 'Approve this order as the sandbox buyer first.')
        }
        throw error
      })
      const captures = order.purchase_units?.flatMap(unit => unit.payments?.captures ?? []) ?? []
      const [capture] = captures
      if (order.id !== id || captures.length !== 1 || capture.amount !== totalCents) {
        throw new PayPalError('response', 'request')
      }
      if (capture.status === 'PENDING') throw new AppError(409, 'CAPTURE_PENDING', 'The sandbox capture is pending. Try the approval return again shortly.')
      if (capture.status !== 'COMPLETED' || order.status !== 'COMPLETED') {
        throw new AppError(409, 'CAPTURE_FAILED', 'The sandbox payment was not captured.')
      }
      return capture.id
    },
  }
}

export type OrderPayments = ReturnType<typeof createOrderPayments>
