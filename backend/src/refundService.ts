import type { Db } from './db.js'
import { AppError, notFound } from './errors.js'
import { makePlan } from './logic/plan.js'
import type { OrderStore } from './orderStore.js'
import { PayPalError } from './paypal/client.js'
import type { PayPalRefund, RefundPayments } from './paypal/refunds.js'
import type { RecallStore } from './recallStore.js'
import { refundView, type RefundStore, type StoredRefund } from './refundStore.js'

const replayWindowMs = 5 * 60_000
const explicitDeclines = new Set([
  'REFUND_FAILED_INSUFFICIENT_FUNDS', 'REFUND_AMOUNT_EXCEEDED', 'REFUND_CAPTURE_CURRENCY_MISMATCH',
  'CAPTURE_FULLY_REFUNDED', 'CAPTURE_NOT_REFUNDABLE', 'PERMISSION_DENIED', 'RESOURCE_NOT_FOUND',
])

export function createRefundService(db: Db, orders: OrderStore, recalls: RecallStore, refunds: RefundStore, payments: RefundPayments) {
  const inFlight = new Map<string, Promise<StoredRefund>>()
  const draftPlan = (id: string) => makePlan(recalls.read(id), orders.list(true))

  const reserve = db.transaction((id: string) => {
    const approved = recalls.approvedPlan(id)
    if (approved) return { plan: approved, rows: refunds.list(id), repeat: true }

    const plan = draftPlan(id)
    if (plan.blocking_problems.length) throw new AppError(409, 'PLAN_BLOCKED', plan.blocking_problems[0])
    const rows = plan.orders.filter(order => order.bucket === 'confirmed' && order.refund_cents > 0)
      .map(order => refunds.reserve(id, order.order_id, order.refund_cents))
    if (rows.length) recalls.authorize(id, plan)
    return { plan, rows, repeat: false }
  })

  function record(row: StoredRefund, result: PayPalRefund) {
    const error = result.status === 'FAILED' ? 'REFUND_FAILED' : result.status === 'CANCELLED' ? 'REFUND_CANCELLED' : null
    return db.transaction(() => {
      const updated = refunds.update(row, result.status, result.id, error)
      if (updated.status === 'COMPLETED' && refunds.list(row.recall_id).every(item => item.status === 'COMPLETED')) {
        recalls.complete(row.recall_id)
      }
      return updated
    }).immediate()
  }

  async function lookup(row: StoredRefund) {
    if (!row.paypal_refund_id) return row
    try {
      const result = await payments.get(row.paypal_refund_id, row.amount_cents)
      return row.status === 'PENDING' ? record(row, result) : row
    } catch (error) {
      if (!(error instanceof PayPalError)) throw error
      return row
    }
  }

  async function submit(id: string) {
    let row = refunds.get(id)
    if (row.status !== 'INITIATED') return row

    const order = orders.byId(row.order_id)
    if (!order?.paypal_capture_id || order.status !== 'CAPTURED') {
      throw new AppError(409, 'PLAN_BLOCKED', 'The order has no eligible captured payment.')
    }
    const submission = refunds.markSubmitted(row)
    row = submission.row
    if (row.status !== 'INITIATED') return row
    const first = submission.marked
    const elapsed = Date.now() - Date.parse(row.attempt_submitted_at ?? '')
    if (!first && (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= replayWindowMs)) {
      return row.error === 'REFUND_RECONCILIATION_REQUIRED' ? row : refunds.defer(row, 'REFUND_RECONCILIATION_REQUIRED')
    }

    let result
    try {
      result = await payments.create(order.paypal_capture_id, row.amount_cents, row.paypal_request_id)
    } catch (error) {
      if (!(error instanceof PayPalError)) throw error
      if (first && error.phase === 'auth') return refunds.defer(row, 'REFUND_STATUS_UNKNOWN', null)
      if (first && error.kind === 'http' && error.upstreamStatus && [400, 403, 404, 422].includes(error.upstreamStatus)
        && error.issue && explicitDeclines.has(error.issue)) {
        return refunds.update(row, 'FAILED', null, 'REFUND_FAILED')
      }
      // A timeout or uncertain rejection may follow a successful remote refund.
      return refunds.defer(row, 'REFUND_STATUS_UNKNOWN')
    }
    const recorded = record(row, result)
    return first ? recorded : lookup(recorded)
  }

  function once(row: StoredRefund, action: () => Promise<StoredRefund>) {
    const prior = inFlight.get(row.id)
    if (prior) return prior
    const pending = action().finally(() => inFlight.delete(row.id))
    inFlight.set(row.id, pending)
    return pending
  }

  return {
    plan: (id: string) => recalls.approvedPlan(id) ?? draftPlan(id),
    async approve(id: string) {
      const { plan, rows, repeat } = reserve.immediate(id)
      const latest = await Promise.all(rows.map(row => row.status === 'INITIATED'
        ? once(row, () => submit(row.id)) : row))
      return { plan, results: latest.map(row => refundView(row, repeat)) }
    },
    async list(id: string) {
      recalls.find(id)
      const rows = await Promise.all(refunds.list(id).map(row => {
        if (row.status === 'INITIATED') return once(row, () => submit(row.id))
        if (row.status === 'PENDING') return once(row, () => lookup(row))
        return row
      }))
      return rows.map(row => refundView(row))
    },
    async retry(id: string, orderId: string) {
      const row = db.transaction(() => {
        recalls.find(id)
        const previous = refunds.find(id, orderId)
        if (!previous) throw notFound('Refund')
        if (previous.status !== 'FAILED') {
          throw new AppError(409, 'REFUND_NOT_RETRYABLE', 'Only failed refunds can start a new attempt.')
        }
        const order = orders.list(true).find(item => item.id === orderId)
        if (!order?.paypal_capture_id || order.status !== 'CAPTURED' || previous.amount_cents > order.total_cents - order.refunded_cents) {
          throw new AppError(409, 'PLAN_BLOCKED', 'The refund exceeds the remaining captured balance.')
        }
        return refunds.retry(previous)
      }).immediate()
      return refundView(await once(row, () => submit(row.id)))
    },
  }
}

export type RefundService = ReturnType<typeof createRefundService>
