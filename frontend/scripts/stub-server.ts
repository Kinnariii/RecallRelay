import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import type { Order, Plan, Recall, RecallEdits, RefundRow } from '../src/api/schemas'

const seed: typeof import('../../data/seed.json') = JSON.parse(readFileSync(new URL('../../data/seed.json', import.meta.url), 'utf8'))
const port = Number(process.env.STUB_PORT ?? 4000)
const recallId = 'stub-recall-1'
let orders: Order[] = []
let recall: Recall | undefined
let approvedPlan: Plan | undefined
let refund: RefundRow | undefined
let cold = process.env.STUB_COLD_START === '1'

function seedOrders() {
  return seed.orders.map<Order>(({ lines, ...order }) => ({
    ...order, currency: 'USD', status: 'CAPTURED', refunded_cents: 0, approval_url: null,
    paypal_order_id: `STUB-${order.id}`, paypal_capture_id: `STUB-CAP-${order.id}`,
    lines: lines.map(({ sku, ...line }, index) => ({ ...seed.catalog.find(item => item.sku === sku)!, ...line, id: `${order.id}-${index}` })),
  }))
}

function planFor(current: Recall): Plan {
  if (approvedPlan) return approvedPlan
  // This fixture exercises the demo receipt and the edited upper bound.
  const supported = current.sku === 'PB-340' && current.lot_prefix === 'B-' &&
    current.lot_start === 200 && (current.lot_end === 250 || current.lot_end === 251)
  const fixture = [
    { bucket: 'confirmed', reason: 'Lot B-214 matched the recalled range.', refund_cents: 2400, classification: 'affected' },
    { bucket: 'unaffected', reason: 'Lot B-310 is outside the recalled range.', refund_cents: 0, classification: 'unaffected' },
    { bucket: 'uncertain', reason: 'No lot number recorded for this SKU. Manual review needed.', refund_cents: 0, classification: 'uncertain' },
  ] as const
  return {
    recall_id: current.id, blocking_problems: supported ? [] : ['This contract stub only has a fixture for the demo range.'],
    total_refund_cents: supported && orders.length ? 2400 : 0,
    orders: orders.map(({ id, customer_name, customer_email, total_cents, lines }, index) => ({
      order_id: id, customer_name, customer_email, total_cents,
      bucket: fixture[index].bucket, reason: fixture[index].reason, refund_cents: supported ? fixture[index].refund_cents : 0,
      lines: lines.map((line, position) => ({
        ...line, line_total_cents: line.qty * line.unit_price_cents,
        classification: position === 0 ? fixture[index].classification : 'not_applicable',
      })),
    })),
  }
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function fail(res: ServerResponse, status: number, code: string) {
  send(res, status, { error: { code, message: 'Contract stub diagnostic' } })
}

async function body(req: IncomingMessage) {
  let text = ''
  for await (const chunk of req) text += String(chunk)
  return JSON.parse(text)
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  const { method, url } = req
  if (method === 'OPTIONS') { res.writeHead(204).end(); return }
  if (method === 'GET' && url === '/api/health') { cold = false; return send(res, 200, { ok: true }) }
  if (cold) return fail(res, 503, 'SERVER_WAKING')

  try {
    if (method === 'POST' && url === '/api/admin/reset') {
      recall = undefined
      approvedPlan = undefined
      refund = undefined
      orders = seedOrders()
      return send(res, 200, { orders })
    }
    if (method === 'POST' && url === '/api/admin/seed') {
      if (!orders.length) orders = seedOrders()
      return send(res, 200, { orders })
    }
    if (method === 'GET' && url === '/api/orders') return send(res, 200, { orders })
    if (method === 'POST' && url === '/api/recalls/extract') {
      const { noticeText } = await body(req)
      if (typeof noticeText !== 'string' || !noticeText.trim()) return fail(res, 400, 'INVALID_INPUT')
      const catalog_match = seed.catalog[0]
      const scope = { sku: catalog_match.sku, lot_prefix: 'B-', lot_start: 200, lot_end: 250 }
      recall = {
        id: recallId, notice_text: noticeText, status: 'DRAFT', ...scope, catalog_match,
        extraction: {
          ...scope, product_name: catalog_match.name, extra_lots: [], ambiguities: [], confidence: 'high',
          evidence: ['PB-340', 'B-200 through B-250'].map((quote, index) => ({
            field: index === 0 ? 'sku' : 'lot_range', quote, verified: noticeText.includes(quote),
          })),
        },
      }
      approvedPlan = undefined
      refund = undefined
      return send(res, 200, { recall })
    }

    const path = `/api/recalls/${recallId}`
    if (!recall || !url?.startsWith(path)) return fail(res, 404, 'NOT_FOUND')
    if (method === 'PATCH' && url === path) {
      if (approvedPlan) return fail(res, 400, 'RECALL_LOCKED')
      const edits: RecallEdits = await body(req)
      Object.assign(recall, edits, { catalog_match: seed.catalog.find(item => item.sku === edits.sku) ?? null })
      return send(res, 200, { recall })
    }
    if (method === 'GET' && url === `${path}/plan`) return send(res, 200, { plan: planFor(recall) })
    if (method === 'POST' && url === `${path}/approve`) {
      const plan = planFor(recall)
      if (plan.blocking_problems.length) return fail(res, 400, 'PLAN_BLOCKED')
      if (refund) return send(res, 200, { plan, results: [{ ...refund, already_existed: true }] })
      const order = plan.orders.find(item => item.bucket === 'confirmed')
      if (!order) return send(res, 200, { plan, results: [] })
      const now = new Date().toISOString()
      const failed = process.env.STUB_FAIL_ONCE === '1'
      refund = {
        id: 'stub-refund-row', recall_id: recall.id, order_id: order.order_id, amount_cents: order.refund_cents,
        attempt: 1, paypal_request_id: `recall-${recall.id}-order-${order.order_id}-attempt-1`,
        paypal_refund_id: failed ? null : 'STUB-PARTIAL-REFUND', status: failed ? 'FAILED' : 'COMPLETED',
        error: failed ? 'REFUND_FAILED' : null, created_at: now, updated_at: now, already_existed: false,
      }
      if (!failed) orders[0].refunded_cents = refund.amount_cents
      approvedPlan = plan
      recall.status = failed ? 'APPROVED' : 'COMPLETED'
      return send(res, 200, { plan, results: [refund] })
    }
    if (method === 'GET' && url === `${path}/refunds`) {
      if (refund?.status === 'PENDING') {
        refund.status = 'COMPLETED'
        refund.updated_at = new Date().toISOString()
        orders[0].refunded_cents = refund.amount_cents
        recall.status = 'COMPLETED'
      }
      return send(res, 200, { refunds: refund ? [refund] : [] })
    }
    if (method === 'POST' && refund && url === `${path}/refunds/${refund.order_id}/retry`) {
      if (refund.status !== 'FAILED') return fail(res, 400, 'REFUND_NOT_RETRYABLE')
      refund.attempt++
      refund.paypal_request_id = `recall-${recallId}-order-${refund.order_id}-attempt-${refund.attempt}`
      refund.paypal_refund_id = 'STUB-PARTIAL-REFUND'
      refund.status = 'PENDING'
      refund.error = null
      refund.updated_at = new Date().toISOString()
      return send(res, 200, { refund })
    }
    return fail(res, 404, 'NOT_FOUND')
  } catch {
    return fail(res, 400, 'INVALID_INPUT')
  }
})

server.listen(port, '127.0.0.1', () => console.log(`RecallRelay contract stub listening on port ${port}`))
