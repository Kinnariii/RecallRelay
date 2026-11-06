import { z } from 'zod'

export const text = z.string().trim().min(1)
export const cents = z.number().int().nonnegative()
export const lotNumber = z.number().int().nonnegative().nullable()

export const catalogSchema = z.object({ sku: text, name: text, unit_price_cents: cents })
export type CatalogItem = z.infer<typeof catalogSchema>

export type Line = CatalogItem & { id: string; qty: number; lot_number: string | null }
export type Order = {
  id: string
  customer_name: string
  customer_email: string
  paypal_order_id: string
  paypal_capture_id: string | null
  status: 'CREATED' | 'AWAITING_APPROVAL' | 'CAPTURED' | 'FAILED'
  total_cents: number
  currency: 'USD'
  approval_url: string | null
  refunded_cents: number
  lines: Line[]
}

export const lotFields = {
  lot_prefix: text.nullable(),
  lot_start: lotNumber,
  lot_end: lotNumber,
}

const evidence = z.strictObject({ field: text, quote: z.string().min(1) })
export const modelExtractionSchema = z.strictObject({
  sku: text.nullable(),
  product_name: text.nullable(),
  ...lotFields,
  extra_lots: z.array(text),
  evidence: z.array(evidence),
  ambiguities: z.array(text),
  confidence: z.enum(['high', 'medium', 'low']),
})
export const extractionSchema = modelExtractionSchema.extend({ evidence: z.array(evidence.extend({ verified: z.boolean() })) })
export type Extraction = z.infer<typeof extractionSchema>
export type ModelExtraction = z.infer<typeof modelExtractionSchema>

export type RecallScope = Pick<Extraction, 'sku' | 'lot_prefix' | 'lot_start' | 'lot_end'>
export type Recall = RecallScope & {
  id: string
  notice_text: string
  status: 'DRAFT' | 'APPROVED' | 'COMPLETED'
  extraction: Extraction
  catalog_match: CatalogItem | null
}
export type Classification = 'affected' | 'unaffected' | 'uncertain' | 'not_applicable'
export type PlannedOrder = Pick<Order, 'customer_name' | 'customer_email' | 'total_cents'> & {
  order_id: string
  bucket: 'confirmed' | 'uncertain' | 'unaffected' | 'excluded'
  reason: string
  refund_cents: number
  lines: (Omit<Line, 'id'> & { classification: Classification; line_total_cents: number })[]
}
export type Plan = {
  recall_id: string
  blocking_problems: string[]
  total_refund_cents: number
  orders: PlannedOrder[]
}

export type RefundRow = {
  id: string
  recall_id: string
  order_id: string
  amount_cents: number
  attempt: number
  paypal_request_id: string
  paypal_refund_id: string | null
  status: 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  error: string | null
  created_at: string
  updated_at: string
  already_existed: boolean
}
