import type { Db } from './db.js'
import { notFound } from './errors.js'
import type { CatalogItem, Line, Order } from './types.js'

type OrderHeader = Omit<Order, 'lines' | 'refunded_cents'>

export function createOrderStore(db: Db) {
  const byPayPalId = db.prepare<[string], OrderHeader>('SELECT * FROM orders WHERE paypal_order_id = ?')
  const byId = db.prepare<[string], OrderHeader>('SELECT * FROM orders WHERE id = ?')
  const orders = db.prepare<[number], OrderHeader & { refunded_cents: number }>(`
    SELECT o.id, o.customer_name, o.customer_email, o.paypal_order_id, o.paypal_capture_id,
      o.status, o.total_cents, o.currency, o.approval_url,
      COALESCE((SELECT SUM(r.amount_cents) FROM refunds r WHERE r.order_id = o.id
        AND (r.status IN ('COMPLETED', 'PENDING') OR (? = 1 AND r.status = 'INITIATED'))), 0) AS refunded_cents
    FROM orders o ORDER BY o.id
  `)
  const lines = db.prepare<[string], Line>(`
    SELECT id, sku, name, qty, unit_price_cents, lot_number FROM order_lines WHERE order_id = ? ORDER BY id
  `)
  const capture = db.prepare(`
    UPDATE orders SET paypal_capture_id = ?, status = 'CAPTURED', approval_url = NULL
    WHERE paypal_order_id = ? AND paypal_capture_id IS NULL
  `)
  const failed = db.prepare(`
    UPDATE orders SET status = 'FAILED', approval_url = NULL WHERE paypal_order_id = ? AND paypal_capture_id IS NULL
  `)
  const product = db.prepare<[string], CatalogItem>('SELECT sku, name, unit_price_cents FROM catalog WHERE sku = ?')

  return {
    list: (withReservations = false): Order[] => orders.all(Number(withReservations)).map(order => ({
      ...order, lines: lines.all(order.id),
    })),
    byPayPalId(id: string) {
      const order = byPayPalId.get(id)
      if (!order) throw notFound('Order')
      return order
    },
    byId: (id: string) => byId.get(id),
    capture: (id: string, captureId: string) => capture.run(captureId, id),
    failCapture: (id: string) => failed.run(id),
    product: (sku: string | null) => sku ? product.get(sku) ?? null : null,
  }
}

export type OrderStore = ReturnType<typeof createOrderStore>
