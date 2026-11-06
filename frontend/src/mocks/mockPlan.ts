import type { Order, Plan, PlannedOrder, Recall, RefundRow } from '../api/schemas'

export function parseLot(lot: string | null) {
  const match = /^([a-z]+-)(\d+)$/i.exec(lot?.trim() ?? '')
  if (!match) return null
  const number = Number(match[2])
  return Number.isSafeInteger(number) ? { prefix: match[1], number } : null
}

export function lotInRecall(lot: string | null, recall: Recall) {
  const { extra_lots: extraLots } = recall.extraction
  if (lot && extraLots.includes(lot)) return 'affected'
  const parsed = parseLot(lot)
  if (!parsed) return 'uncertain'
  const { lot_prefix: prefix, lot_start: start, lot_end: end } = recall
  if (prefix && start !== null && end !== null && start <= end) {
    if (parsed.prefix !== prefix) return 'uncertain'
    return parsed.number >= start && parsed.number <= end ? 'affected' : 'unaffected'
  }
  return extraLots.some(extra => parseLot(extra)?.prefix === parsed.prefix) ? 'unaffected' : 'uncertain'
}

export function makePlan(recall: Recall, orders: Order[]): Plan {
  const blocking_problems: string[] = []
  if (!recall.catalog_match) blocking_problems.push('Choose a SKU that exists in the catalog.')
  const range = recall.lot_prefix && recall.lot_start !== null && recall.lot_end !== null && recall.lot_start <= recall.lot_end
  const hasLots = Boolean(range || recall.extraction.extra_lots.length)
  if (!hasLots) blocking_problems.push('Provide a lot prefix and both bounds, or use a notice that lists exact lots.')

  const planned = orders.map<PlannedOrder>(order => {
    const lines = order.lines.map<PlannedOrder['lines'][number]>(line => ({
      ...line,
      classification: line.sku !== recall.sku ? 'not_applicable'
        : hasLots && recall.catalog_match ? lotInRecall(line.lot_number, recall) : 'uncertain',
      line_total_cents: line.qty * line.unit_price_cents,
    }))
    const base = {
      order_id: order.id, customer_name: order.customer_name, customer_email: order.customer_email,
      total_cents: order.total_cents, lines,
    }
    if (order.status !== 'CAPTURED' || !order.paypal_capture_id) {
      return { ...base, bucket: 'excluded', refund_cents: 0, reason: 'Payment has not been captured. This order cannot be refunded.' }
    }

    const affected = lines.filter(line => line.classification === 'affected')
    if (affected.length) {
      const amount = affected.reduce((sum, line) => sum + line.line_total_cents, 0)
      const exceedsBalance = amount > order.total_cents - order.refunded_cents
      if (exceedsBalance) blocking_problems.push(`Order ${order.id} has insufficient captured balance for its affected items.`)
      return {
        ...base, bucket: 'confirmed', refund_cents: exceedsBalance ? 0 : amount,
        reason: exceedsBalance ? 'The affected items exceed the remaining captured balance.'
          : `${affected.map(line => line.lot_number).join(', ')} matched the recalled lots. Only the affected items are included in the refund.`,
      }
    }
    if (lines.some(line => line.classification === 'uncertain')) {
      const missing = lines.some(line => line.classification === 'uncertain' && !line.lot_number?.trim())
      return { ...base, bucket: 'uncertain', refund_cents: 0, reason: missing
        ? 'No lot number recorded for this SKU. Manual review needed.'
        : 'A lot number could not be matched confidently. Manual review needed.' }
    }
    return { ...base, bucket: 'unaffected', refund_cents: 0, reason: lines.some(line => line.sku === recall.sku)
      ? 'The matching SKU is outside the recalled lots.' : 'The recalled SKU is not in this order.' }
  })
  return {
    recall_id: recall.id, blocking_problems, orders: planned,
    total_refund_cents: planned.reduce((total, order) => total + order.refund_cents, 0),
  }
}

export function makeRefund(recallId: string, orderId: string, amount: number, failed: boolean, previous?: RefundRow): RefundRow {
  const attempt = previous ? previous.attempt + 1 : 1
  const now = new Date().toISOString()
  return {
    id: previous?.id ?? crypto.randomUUID(), recall_id: recallId, order_id: orderId,
    amount_cents: amount, attempt, paypal_request_id: `recall-${recallId}-order-${orderId}-attempt-${attempt}`,
    paypal_refund_id: failed ? null : `7XK${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`,
    status: failed ? 'FAILED' : 'COMPLETED', error: failed ? 'REFUND_FAILED' : null,
    created_at: previous?.created_at ?? now, updated_at: now, already_existed: false,
  }
}
