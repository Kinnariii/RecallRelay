import { beforeAll, expect, it } from 'vitest'
import type { Order, Recall } from '../api/schemas'
import { mockApi } from './mockApi'
import { mockExtract } from './mockExtract'
import { lotInRecall, makePlan } from './mockPlan'
import { samples } from './samples'

const notice = samples[0].text
const extraction = mockExtract(notice)
const recall: Recall = {
  ...extraction, id: 'test', notice_text: notice, status: 'DRAFT', extraction,
  catalog_match: { sku: 'PB-340', name: 'Peanut butter', unit_price_cents: 2400 },
}
let orders: Order[]

beforeAll(async () => {
  orders = (await mockApi.reset()).orders.map(order => ({ ...order, status: 'CAPTURED', paypal_capture_id: order.id }))
})

it.each([
  ['B-200', 'affected'], ['B-250', 'affected'], ['B-199', 'unaffected'], ['B-251', 'unaffected'],
  [null, 'uncertain'], ['', 'uncertain'], ['garbage', 'uncertain'], ['A-214', 'uncertain'],
])('classifies lot %s as %s', (lot, classification) => {
  expect(lotInRecall(lot, recall)).toBe(classification)
})

it('sums two affected lines and ignores unrelated SKUs', () => {
  const order = { ...orders[0], total_cents: 10000, lines: [...orders[0].lines, { ...orders[0].lines[0], id: 'additional', lot_number: 'B-250' }] }
  const plan = makePlan(recall, [order])
  expect(plan.total_refund_cents).toBe(4800)
  expect(plan.orders[0].lines[1].classification).toBe('not_applicable')
  expect(makePlan(recall, [{ ...order, lines: [order.lines[1]] }]).orders[0].bucket).toBe('unaffected')
})

it('plans the three demo orders and preserves the missing lot flag', () => {
  const plan = makePlan(recall, orders)
  expect(plan.total_refund_cents).toBe(2400)
  expect(plan.orders.map(order => [order.bucket, order.refund_cents])).toEqual([
    ['confirmed', 2400], ['unaffected', 0], ['uncertain', 0],
  ])
})

it('blocks refunds beyond available capture and excludes missing captures', () => {
  const plan = makePlan(recall, [{ ...orders[0], refunded_cents: 4500 }, { ...orders[1], paypal_capture_id: null }])
  expect(plan.total_refund_cents).toBe(0)
  expect(plan.blocking_problems).toHaveLength(1)
  expect(plan.orders[1].bucket).toBe('excluded')
})

it('matches exact lot lists and blocks incomplete extraction', () => {
  const list = { ...recall, lot_prefix: null, lot_start: null, lot_end: null, extraction: mockExtract(samples[1].text) }
  expect(lotInRecall('B-104', list)).toBe('affected')
  expect(lotInRecall('B-105', list)).toBe('unaffected')
  expect(makePlan({ ...list, extraction: mockExtract(samples[4].text) }, orders).blocking_problems).toHaveLength(1)
})
