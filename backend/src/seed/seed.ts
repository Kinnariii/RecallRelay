import { randomBytes } from 'node:crypto'
import type { Db } from '../db.js'
import type { OrderStore } from '../orderStore.js'
import type { OrderPayments } from '../paypal/orders.js'
import { catalog, demoOrders } from './fixtures.js'

export function loadCatalog(db: Db) {
  const add = db.prepare('INSERT OR IGNORE INTO catalog (sku, name, unit_price_cents) VALUES (@sku, @name, @unit_price_cents)')
  db.transaction(() => { for (const item of catalog) add.run(item) }).immediate()
}

export function createDemoSeed(db: Db, orders: OrderStore, payments: OrderPayments) {
  const getSeedKey = db.prepare<[], string>('SELECT seed_key FROM demo_state WHERE id = 1').pluck()
  const setSeedKey = db.prepare('INSERT OR REPLACE INTO demo_state (id, seed_key) VALUES (1, ?)')
  const ensureSeedKey = db.transaction(() => {
    const prior = getSeedKey.get()
    if (prior) return prior
    const key = randomBytes(12).toString('base64url')
    setSeedKey.run(key)
    return key
  })
  const addOrder = db.prepare(`
    INSERT INTO orders (id, customer_name, customer_email, paypal_order_id, status, total_cents, approval_url, created_at)
    VALUES (@id, @customer_name, @customer_email, @paypal_order_id, 'AWAITING_APPROVAL', @total_cents, @approval_url, @created_at)
  `)
  const addLine = db.prepare(`
    INSERT INTO order_lines (id, order_id, sku, name, qty, unit_price_cents, lot_number)
    VALUES (@id, @order_id, @sku, @name, @qty, @unit_price_cents, @lot_number)
  `)

  async function create() {
    const existing = orders.list()
    if (existing.length) return existing
    const key = ensureSeedKey.immediate()
    // Wait for every request to finish so a retry cannot overlap an earlier create batch.
    const results = await Promise.allSettled(demoOrders.map((order, index) =>
      payments.create(order.total_cents, `seed-${key}-${index + 1}`)))
    return db.transaction(() => {
      if (orders.list().length) return orders.list()
      const created_at = new Date().toISOString()
      results.forEach((result, index) => {
        if (result.status === 'rejected') throw result.reason
        const fixture = demoOrders[index]
        const id = String(index + 1)
        addOrder.run({ ...fixture, id, paypal_order_id: result.value.id, approval_url: result.value.approvalUrl, created_at })
        for (const line of fixture.lines) addLine.run({ ...line, order_id: id })
      })
      return orders.list()
    }).immediate()
  }

  let pending: ReturnType<typeof create> | undefined
  function seed() {
    pending ??= create().finally(() => { pending = undefined })
    return pending
  }

  async function reset() {
    db.transaction(() => {
      if (orders.list().length) db.exec('DELETE FROM demo_state')
      db.exec('DELETE FROM refunds; DELETE FROM recalls; DELETE FROM orders;')
    }).immediate()
    return seed()
  }

  return { seed, reset }
}

export type DemoSeed = ReturnType<typeof createDemoSeed>
