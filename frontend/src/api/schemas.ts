import { z } from 'zod'

const id = z.string().min(1)
const cents = z.number().int().nonnegative()
const lotNumber = z.number().int().nonnegative().nullable()
const sku = z.string().trim().min(1)
const lotFields = {
  lot_prefix: z.string().nullable(),
  lot_start: lotNumber,
  lot_end: lotNumber,
}

export const catalogItemSchema = z.object({ sku, name: z.string(), unit_price_cents: cents })
const lineSchema = catalogItemSchema.extend({ qty: z.number().int().positive(), lot_number: z.string().nullable() })
export const orderSchema = z.object({
  id, customer_name: z.string(), customer_email: z.string(), paypal_order_id: id,
  paypal_capture_id: id.nullable(), status: z.enum(['CREATED', 'AWAITING_APPROVAL', 'CAPTURED', 'FAILED']),
  total_cents: cents, currency: z.literal('USD'), approval_url: z.string().nullable(),
  refunded_cents: cents, lines: z.array(lineSchema.extend({ id })),
})
export const extractionSchema = z.object({
  sku: sku.nullable(), product_name: z.string().nullable(), ...lotFields,
  extra_lots: z.array(z.string()),
  evidence: z.array(z.object({ field: z.string(), quote: z.string(), verified: z.boolean() })),
  ambiguities: z.array(z.string()), confidence: z.enum(['high', 'medium', 'low']),
})
export const recallSchema = z.object({
  id, notice_text: z.string(), status: z.enum(['DRAFT', 'APPROVED', 'COMPLETED']),
  sku: sku.nullable(), ...lotFields, extraction: extractionSchema,
  catalog_match: catalogItemSchema.nullable(),
})
export const editSchema = z.object({ sku, ...lotFields })
export const plannedOrderSchema = z.object({
  order_id: id, customer_name: z.string(), customer_email: z.string(), total_cents: cents,
  bucket: z.enum(['confirmed', 'uncertain', 'unaffected', 'excluded']),
  reason: z.string(), refund_cents: cents,
  lines: z.array(lineSchema.extend({
    classification: z.enum(['affected', 'unaffected', 'uncertain', 'not_applicable']),
    line_total_cents: cents,
  })),
})
export const planSchema = z.object({
  recall_id: id, blocking_problems: z.array(z.string()), total_refund_cents: cents,
  orders: z.array(plannedOrderSchema),
})
export const refundSchema = z.object({
  id, recall_id: id, order_id: id, amount_cents: cents, attempt: z.number().int().positive(),
  paypal_request_id: id, paypal_refund_id: id.nullable(),
  status: z.enum(['INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  error: z.string().nullable(), created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }), already_existed: z.boolean(),
})

export const responses = {
  health: z.object({ ok: z.literal(true) }),
  orders: z.object({ orders: z.array(orderSchema) }),
  recall: z.object({ recall: recallSchema }),
  plan: z.object({ plan: planSchema }),
  approval: z.object({ results: z.array(refundSchema), plan: planSchema }),
  refunds: z.object({ refunds: z.array(refundSchema) }),
  refund: z.object({ refund: refundSchema }),
  error: z.object({ error: z.object({ code: z.string(), message: z.string() }) }),
}

export type Order = z.infer<typeof orderSchema>
export type Extraction = z.infer<typeof extractionSchema>
export type Recall = z.infer<typeof recallSchema>
export type RecallEdits = z.infer<typeof editSchema>
export type PlannedOrder = z.infer<typeof plannedOrderSchema>
export type Plan = z.infer<typeof planSchema>
export type RefundRow = z.infer<typeof refundSchema>
export type Approval = z.infer<typeof responses.approval>

export interface Api {
  health(): Promise<z.infer<typeof responses.health>>
  seed(): Promise<z.infer<typeof responses.orders>>
  reset(): Promise<z.infer<typeof responses.orders>>
  orders(): Promise<z.infer<typeof responses.orders>>
  extract(noticeText: string): Promise<z.infer<typeof responses.recall>>
  updateRecall(id: string, edits: RecallEdits): Promise<z.infer<typeof responses.recall>>
  plan(id: string): Promise<z.infer<typeof responses.plan>>
  approve(id: string): Promise<Approval>
  refunds(id: string): Promise<z.infer<typeof responses.refunds>>
  retry(id: string, orderId: string): Promise<z.infer<typeof responses.refund>>
  mockCapture?(orderId: string): Promise<z.infer<typeof responses.orders>>
}
