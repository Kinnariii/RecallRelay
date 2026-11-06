import { randomUUID } from 'node:crypto'
import type { Db } from './db.js'
import { AppError, notFound } from './errors.js'
import type { RefundRow } from './types.js'

export type StoredRefund = Omit<RefundRow, 'already_existed'> & { attempt_submitted_at: string | null }

export function refundView({ attempt_submitted_at: _submitted, ...row }: StoredRefund, already_existed = false): RefundRow {
  return { ...row, already_existed }
}

function requestId(recallId: string, orderId: string, attempt: number) {
  const id = `recall-${recallId}-order-${orderId}-attempt-${attempt}`
  if (Buffer.byteLength(id) > 38) throw new AppError(409, 'REFUND_NOT_RETRYABLE', 'This refund has reached its attempt limit.')
  return id
}

export function createRefundStore(db: Db) {
  const rows = db.prepare<[string], StoredRefund>('SELECT * FROM refunds WHERE recall_id = ? ORDER BY order_id')
  const byOrder = db.prepare<[string, string], StoredRefund>('SELECT * FROM refunds WHERE recall_id = ? AND order_id = ?')
  const byId = db.prepare<[string], StoredRefund>('SELECT * FROM refunds WHERE id = ?')
  const reserve = db.prepare(`
    INSERT INTO refunds (id, recall_id, order_id, amount_cents, paypal_request_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'INITIATED', ?, ?)
  `)
  const submit = db.prepare(`
    UPDATE refunds SET attempt_submitted_at = ?, updated_at = ?
    WHERE id = ? AND attempt = ? AND status = 'INITIATED' AND attempt_submitted_at IS NULL
  `)
  const update = db.prepare(`
    UPDATE refunds SET status = ?, paypal_refund_id = ?, error = ?, updated_at = ?
    WHERE id = ? AND attempt = ? AND status IN ('INITIATED', 'PENDING')
  `)
  const defer = db.prepare(`
    UPDATE refunds SET error = ?, updated_at = ?, attempt_submitted_at = ?
    WHERE id = ? AND attempt = ? AND status = 'INITIATED'
  `)
  const retry = db.prepare(`
    UPDATE refunds SET attempt = ?, paypal_request_id = ?, paypal_refund_id = NULL,
      status = 'INITIATED', error = NULL, updated_at = ?, attempt_submitted_at = NULL
    WHERE id = ? AND attempt = ? AND status = 'FAILED'
  `)

  function get(id: string) {
    const row = byId.get(id)
    if (!row) throw notFound('Refund')
    return row
  }

  return {
    get,
    list: (recallId: string) => rows.all(recallId),
    find: (recallId: string, orderId: string) => byOrder.get(recallId, orderId),
    reserve(recallId: string, orderId: string, amount: number) {
      const id = randomUUID()
      const now = new Date().toISOString()
      reserve.run(id, recallId, orderId, amount, requestId(recallId, orderId, 1), now, now)
      return get(id)
    },
    markSubmitted(row: StoredRefund) {
      const now = new Date().toISOString()
      const marked = submit.run(now, now, row.id, row.attempt).changes === 1
      return { row: get(row.id), marked }
    },
    update(row: StoredRefund, status: RefundRow['status'], paypalId: string | null, error: string | null) {
      update.run(status, paypalId, error, new Date().toISOString(), row.id, row.attempt)
      return get(row.id)
    },
    defer(row: StoredRefund, error: string, submittedAt = row.attempt_submitted_at) {
      defer.run(error, new Date().toISOString(), submittedAt, row.id, row.attempt)
      return get(row.id)
    },
    retry(row: StoredRefund) {
      const attempt = row.attempt + 1
      if (!retry.run(attempt, requestId(row.recall_id, row.order_id, attempt), new Date().toISOString(), row.id, row.attempt).changes) {
        throw new AppError(409, 'REFUND_NOT_RETRYABLE', 'Only failed refunds can start a new attempt.')
      }
      return get(row.id)
    },
  }
}

export type RefundStore = ReturnType<typeof createRefundStore>
