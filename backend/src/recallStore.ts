import { randomBytes } from 'node:crypto'
import type { Db } from './db.js'
import { AppError, notFound } from './errors.js'
import type { OrderStore } from './orderStore.js'
import { extractionSchema, type Extraction, type Plan, type Recall, type RecallScope } from './types.js'

type StoredRecall = RecallScope & Pick<Recall, 'id' | 'notice_text' | 'status'> & {
  extraction_json: string
  approved_plan_json: string | null
}

export function createRecallStore(db: Db, orders: OrderStore) {
  const get = db.prepare<[string], StoredRecall>('SELECT * FROM recalls WHERE id = ?')
  const insert = db.prepare(`
    INSERT INTO recalls (id, notice_text, extraction_json, sku, lot_prefix, lot_start, lot_end, status, created_at)
    VALUES (@id, @notice_text, @extraction_json, @sku, @lot_prefix, @lot_start, @lot_end, 'DRAFT', @created_at)
  `)
  const patch = db.prepare(`
    UPDATE recalls SET sku = @sku, lot_prefix = @lot_prefix, lot_start = @lot_start, lot_end = @lot_end
    WHERE id = @id AND status = 'DRAFT'
  `)
  const authorize = db.prepare(`UPDATE recalls SET status = 'APPROVED', approved_plan_json = ? WHERE id = ? AND status = 'DRAFT'`)
  const complete = db.prepare(`UPDATE recalls SET status = 'COMPLETED' WHERE id = ? AND status = 'APPROVED'`)

  function find(id: string) {
    const row = get.get(id)
    if (!row) throw notFound('Recall')
    return row
  }

  function read(id: string): Recall {
    const row = find(id)
    return {
      id, notice_text: row.notice_text, status: row.status, sku: row.sku,
      lot_prefix: row.lot_prefix, lot_start: row.lot_start, lot_end: row.lot_end,
      extraction: extractionSchema.parse(JSON.parse(row.extraction_json)),
      catalog_match: orders.product(row.sku),
    }
  }

  return {
    find, read,
    create(notice_text: string, extraction: Extraction) {
      const id = randomBytes(8).toString('base64url')
      insert.run({ ...extraction, id, notice_text, extraction_json: JSON.stringify(extraction), created_at: new Date().toISOString() })
      return read(id)
    },
    update(id: string, edits: RecallScope) {
      find(id)
      if (!patch.run({ id, ...edits }).changes) {
        throw new AppError(409, 'RECALL_LOCKED', 'This recall has already been approved.')
      }
      return read(id)
    },
    approvedPlan(id: string): Plan | null {
      const saved = find(id).approved_plan_json
      return saved ? JSON.parse(saved) as Plan : null
    },
    authorize: (id: string, plan: Plan) => authorize.run(JSON.stringify(plan), id),
    complete: (id: string) => complete.run(id),
  }
}

export type RecallStore = ReturnType<typeof createRecallStore>
