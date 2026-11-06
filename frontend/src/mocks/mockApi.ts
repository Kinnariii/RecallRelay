import seed from '../../../data/seed.json'
import { ApiError, validate } from '../api/client'
import { editSchema, orderSchema, planSchema, recallSchema, refundSchema, responses, type Api, type Order, type Plan, type Recall, type RefundRow } from '../api/schemas'
import { z } from 'zod'
import { mockExtract } from './mockExtract'
import { makePlan, makeRefund } from './mockPlan'

export const MOCK_STORAGE_KEY = 'recallrelay:mock:v1'
const failureRequestedOnLoad = new URLSearchParams(location.search).get('mockfail') === '1'
const refundKey = (recallId: string, orderId: string) => JSON.stringify([recallId, orderId])
const refundMap = z.union([z.record(z.string(), refundSchema), z.array(refundSchema)])
  .transform(rows => Array.isArray(rows)
    ? Object.fromEntries(rows.map(row => [refundKey(row.recall_id, row.order_id), row]))
    : rows)
const stateSchema = z.object({
  orders: z.array(orderSchema), recalls: z.array(recallSchema),
  plans: z.array(planSchema), refunds: refundMap,
  failureUsed: z.boolean(),
})
type State = z.infer<typeof stateSchema>

function emptyState(): State {
  return { orders: [], recalls: [], plans: [], refunds: {}, failureUsed: false }
}

function read(): State {
  try {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY)
    if (stored) {
      const result = stateSchema.safeParse(JSON.parse(stored))
      if (result.success) return result.data
    }
  } catch {
    // A missing or invalid demo cache starts empty.
  }
  return emptyState()
}

async function mutate<T>(change: (state: State) => T): Promise<T> {
  function commit() {
    const state = read()
    const result = change(state)
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state))
    } catch {
      throw new ApiError('STORAGE')
    }
    return result
  }
  return navigator.locks ? navigator.locks.request(MOCK_STORAGE_KEY, commit) : commit()
}

function findRecall(state: State, id: string) {
  const recall = state.recalls.find(item => item.id === id)
  if (!recall) throw new ApiError('NOT_FOUND', 404)
  return recall
}

function refundsFor(state: State, id: string): RefundRow[] {
  return Object.values(state.refunds).filter(row => row.recall_id === id)
}

function findPlan(state: State, id: string): Plan {
  return state.plans.find(plan => plan.recall_id === id) ?? makePlan(findRecall(state, id), state.orders)
}

function seedOrders(): Order[] {
  return seed.orders.map(({ lines, ...order }) => ({
    ...order, paypal_order_id: `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, paypal_capture_id: null,
    status: 'AWAITING_APPROVAL', currency: 'USD', approval_url: `#mock-approve-${order.id}`, refunded_cents: 0,
    lines: lines.map(({ sku, ...line }, i) => {
      const item = seed.catalog.find(entry => entry.sku === sku)!
      return { ...item, ...line, id: `${order.id}-line-${i + 1}` }
    }),
  }))
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi: Api = {
  health: async () => validate(responses.health, { ok: true }),
  orders: async () => validate(responses.orders, { orders: read().orders }),
  seed: () => mutate(state => {
    if (!state.orders.length) state.orders = seedOrders()
    return validate(responses.orders, { orders: state.orders })
  }),
  reset: () => mutate(state => {
    Object.assign(state, emptyState(), { orders: seedOrders() })
    return validate(responses.orders, { orders: state.orders })
  }),
  mockCapture: async orderId => {
    const original = read().orders.find(item => item.id === orderId)
    if (!original) throw new ApiError('NOT_FOUND')
    await delay(350)
    return mutate(state => {
      const order = state.orders.find(item => item.paypal_order_id === original.paypal_order_id)
      if (!order) throw new ApiError('NOT_FOUND')
      if (order.status === 'AWAITING_APPROVAL') {
        order.status = 'CAPTURED'
        order.paypal_capture_id = `CAP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        order.approval_url = null
      }
      return validate(responses.orders, { orders: state.orders })
    })
  },
  extract: async notice_text => {
    if (!notice_text.trim()) throw new ApiError('INVALID_INPUT')
    await delay(1200)
    const extraction = mockExtract(notice_text)
    if (!extraction.sku && !extraction.evidence.length) throw new ApiError('EXTRACTION_FAILED')
    const { sku, lot_prefix, lot_start, lot_end } = extraction
    return mutate(state => {
      const recall: Recall = {
        id: crypto.randomUUID().slice(0, 12), notice_text, status: 'DRAFT',
        sku, lot_prefix, lot_start, lot_end, extraction,
        catalog_match: seed.catalog.find(item => item.sku === sku) ?? null,
      }
      state.recalls.push(recall)
      return validate(responses.recall, { recall })
    })
  },
  updateRecall: (id, edits) => mutate(state => {
    const recall = findRecall(state, id)
    if (recall.status !== 'DRAFT') throw new ApiError('RECALL_LOCKED')
    const parsed = editSchema.safeParse(edits)
    if (!parsed.success) throw new ApiError('INVALID_INPUT')
    Object.assign(recall, parsed.data, { catalog_match: seed.catalog.find(item => item.sku === edits.sku) ?? null })
    return validate(responses.recall, { recall })
  }),
  plan: async id => validate(responses.plan, { plan: findPlan(read(), id) }),
  approve: id => mutate(state => {
    const recall = findRecall(state, id)
    const plan = findPlan(state, id)
    if (plan.blocking_problems.length) throw new ApiError('PLAN_BLOCKED')
    const prior = refundsFor(state, id)
    if (prior.length || recall.status !== 'DRAFT') {
      return validate(responses.approval, { plan, results: prior.map(row => ({ ...row, already_existed: true })) })
    }

    const failOnce = failureRequestedOnLoad || new URLSearchParams(location.search).get('mockfail') === '1'
    const results = plan.orders.filter(order => order.bucket === 'confirmed' && order.refund_cents > 0).map(order => {
      const fail = failOnce && !state.failureUsed
      if (fail) state.failureUsed = true
      const row = makeRefund(id, order.order_id, order.refund_cents, fail)
      if (!fail) state.orders.find(item => item.id === order.order_id)!.refunded_cents += row.amount_cents
      return row
    })
    state.plans.push(plan)
    results.forEach(row => { state.refunds[refundKey(id, row.order_id)] = row })
    recall.status = results.some(row => row.status === 'FAILED') ? 'APPROVED' : 'COMPLETED'
    return validate(responses.approval, { plan, results })
  }),
  refunds: async id => {
    const state = read()
    findRecall(state, id)
    return validate(responses.refunds, { refunds: refundsFor(state, id) })
  },
  retry: (id, orderId) => mutate(state => {
    const recall = findRecall(state, id)
    const previous = state.refunds[refundKey(id, orderId)]
    const order = state.orders.find(item => item.id === orderId)
    if (!previous || !order) throw new ApiError('NOT_FOUND')
    if (previous.status !== 'FAILED') throw new ApiError('REFUND_NOT_RETRYABLE')
    if (order.status !== 'CAPTURED' || !order.paypal_capture_id || previous.amount_cents > order.total_cents - order.refunded_cents) {
      throw new ApiError('PLAN_BLOCKED')
    }
    const refund = makeRefund(id, orderId, previous.amount_cents, false, previous)
    Object.assign(previous, refund)
    order.refunded_cents += refund.amount_cents
    if (!refundsFor(state, id).some(row => row.status === 'FAILED')) recall.status = 'COMPLETED'
    return validate(responses.refund, { refund })
  }),
}
