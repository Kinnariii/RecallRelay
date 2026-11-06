import { z } from 'zod'
import { PayPalError, type PayPalClient } from './client.js'
import { usdAmount, usdResponse } from './money.js'
import { payPalId } from './orders.js'

const refundSchema = z.object({
  id: payPalId,
  status: z.enum(['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED']),
  amount: usdResponse.optional(),
})
export type PayPalRefund = Pick<z.infer<typeof refundSchema>, 'id' | 'status'>

export function createRefundPayments(client: PayPalClient) {
  return {
    async create(captureId: string, cents: number, requestId: string): Promise<PayPalRefund> {
      const refund = await client.request(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, refundSchema, {
        body: { amount: usdAmount(cents), note_to_payer: 'Partial refund for items affected by a supplier recall.' },
        requestId,
      })
      if (refund.amount !== undefined && refund.amount !== cents) throw new PayPalError('response', 'request')
      return refund
    },
    async get(refundId: string, cents: number): Promise<PayPalRefund> {
      const refund = await client.request(`/v2/payments/refunds/${encodeURIComponent(refundId)}`, refundSchema)
      if (refund.id !== refundId || (refund.amount !== undefined && refund.amount !== cents)) {
        throw new PayPalError('response', 'request')
      }
      return refund
    },
  }
}

export type RefundPayments = ReturnType<typeof createRefundPayments>
