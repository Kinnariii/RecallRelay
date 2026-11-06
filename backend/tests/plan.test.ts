import { expect, it } from 'vitest'
import { makePlan } from '../src/logic/plan.js'
import { catalog, demoOrders } from '../src/seed/fixtures.js'
import type { Order, Recall, RecallScope } from '../src/types.js'

const scope: RecallScope = { sku: 'PB-340', lot_prefix: 'B-', lot_start: 200, lot_end: 250 }
const recall: Recall = {
  ...scope, id: 'test-recall', notice_text: 'test notice', status: 'DRAFT', catalog_match: catalog[0],
  extraction: { ...scope, product_name: catalog[0].name, extra_lots: [], evidence: [], ambiguities: [], confidence: 'high' },
}
const captured = demoOrders.map<Order>(order => ({
  ...order, paypal_order_id: order.id, paypal_capture_id: order.id, status: 'CAPTURED',
  currency: 'USD', approval_url: null, refunded_cents: 0,
}))

it('plans the shared demo as 2400 cents / no action / manual review', () => {
  const plan = makePlan(recall, captured)
  expect(plan.total_refund_cents).toBe(2400)
  expect(plan.orders.map(order => [order.bucket, order.refund_cents])).toEqual([
    ['confirmed', 2400], ['unaffected', 0], ['uncertain', 0],
  ])
})

it('adds two affected lines and ignores the other SKU', () => {
  const order = captured[0]
  const plan = makePlan(recall, [{
    ...order, total_cents: 9200, lines: [...order.lines, { ...order.lines[0], id: 'second', lot_number: 'B-250' }],
  }])
  expect(plan.orders[0].refund_cents).toBe(4800)
  expect(plan.orders[0].lines[1].classification).toBe('not_applicable')
  expect(makePlan(recall, [{ ...order, lines: [order.lines[1]] }]).orders[0].bucket).toBe('unaffected')
})

it('blocks amounts over the remaining capture and excludes uncaptured orders', () => {
  const plan = makePlan(recall, [{ ...captured[0], refunded_cents: 4401 }, { ...captured[1], paypal_capture_id: null }])
  expect(plan.blocking_problems).toHaveLength(1)
  expect(plan.total_refund_cents).toBe(0)
  expect(plan.orders[1].bucket).toBe('excluded')
})

it('blocks unknown SKUs and incomplete ranges before approval', () => {
  const plan = makePlan({ ...recall, catalog_match: null, lot_end: null }, captured)
  expect(plan.blocking_problems).toHaveLength(2)
  expect(plan.total_refund_cents).toBe(0)
  expect(plan.orders.some(order => order.bucket === 'confirmed')).toBe(false)
})
