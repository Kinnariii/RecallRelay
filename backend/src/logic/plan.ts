import type { Order, Plan, PlannedOrder, Recall } from '../types.js'
import { completeRange, lotInRecall } from './lots.js'

export function makePlan(recall: Recall, orders: Order[]): Plan {
  const scope = { ...recall, extra_lots: recall.extraction.extra_lots }
  const range = completeRange(scope)
  const hasScope = Boolean(range || scope.extra_lots.length)
  const blocking_problems: string[] = []
  if (!recall.catalog_match) blocking_problems.push('Choose a SKU that exists in the catalog.')
  if (!hasScope) blocking_problems.push('Provide a lot prefix and both bounds, or use a notice that lists exact lots.')

  const planned = orders.map<PlannedOrder>(order => {
    const lines = order.lines.map(({ id: _id, ...line }): PlannedOrder['lines'][number] => ({
      ...line,
      line_total_cents: line.qty * line.unit_price_cents,
      classification: line.sku !== recall.sku ? 'not_applicable'
        : hasScope && recall.catalog_match ? lotInRecall(line.lot_number, scope) : 'uncertain',
    }))
    const base = {
      order_id: order.id, customer_name: order.customer_name, customer_email: order.customer_email,
      total_cents: order.total_cents, lines, refund_cents: 0,
    }
    if (!order.paypal_capture_id || order.status !== 'CAPTURED') {
      return { ...base, bucket: 'excluded', reason: 'Payment has not been captured. This order cannot be refunded.' }
    }

    const affected = lines.filter(line => line.classification === 'affected')
    if (affected.length) {
      const amount = affected.reduce((sum, line) => sum + line.line_total_cents, 0)
      if (amount > order.total_cents - order.refunded_cents) {
        blocking_problems.push(`Order ${order.id} has insufficient captured balance for its affected items.`)
        return { ...base, bucket: 'confirmed', reason: 'The affected items exceed the remaining captured balance.' }
      }
      const lots = [...new Set(affected.map(line => line.lot_number))]
      const label = lots.length === 1 ? `Lot ${lots[0]}` : `Lots ${lots.join(', ')}`
      const outsideList = lots.every(lot => lot !== null && !scope.extra_lots.includes(lot))
      const match = range && outsideList
        ? `matched the recalled range ${range.prefix}${range.start} to ${range.prefix}${range.end}.`
        : 'matched the recalled lot list.'
      return { ...base, bucket: 'confirmed', refund_cents: amount, reason: `${label} ${match} Only the affected items are refundable.` }
    }

    const uncertain = lines.filter(line => line.classification === 'uncertain')
    if (uncertain.length) {
      const missing = uncertain.some(line => !line.lot_number?.trim())
      return { ...base, bucket: 'uncertain', reason: missing
        ? 'No lot number recorded for this SKU. Manual review needed.'
        : 'A lot number could not be matched confidently. Manual review needed.' }
    }
    return { ...base, bucket: 'unaffected', reason: lines.some(line => line.sku === recall.sku)
      ? 'The matching SKU is outside the recalled lots.' : 'The recalled SKU is not in this order.' }
  })

  return {
    recall_id: recall.id, blocking_problems, orders: planned,
    total_refund_cents: planned.reduce((total, order) => total + order.refund_cents, 0),
  }
}
