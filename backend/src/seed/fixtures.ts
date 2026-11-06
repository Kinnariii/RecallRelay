import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'
import { catalogSchema, cents, text, type Line } from '../types.js'

const seedSchema = z.object({
  merchant: text,
  catalog: z.array(catalogSchema),
  orders: z.array(z.object({
    id: text, customer_name: text, customer_email: z.email(), total_cents: cents,
    lines: z.array(z.object({ sku: text, qty: z.number().int().positive(), lot_number: text.nullable() })),
  })),
})

const sourcePath = new URL('../../../data/seed.json', import.meta.url)
const builtPath = new URL('../../../../data/seed.json', import.meta.url)
const fixturePath = existsSync(sourcePath) ? sourcePath : builtPath
const fixtures = seedSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf8')))

export const catalog = fixtures.catalog
export const demoOrders = fixtures.orders.map(({ lines, ...order }) => {
  const resolved = lines.map(({ sku, ...line }, index): Line => {
    const product = catalog.find(item => item.sku === sku)
    if (!product) throw new Error('A demo line has an unknown SKU.')
    return { ...product, ...line, id: `${order.id}-line-${index + 1}` }
  })
  if (resolved.reduce((sum, line) => sum + line.qty * line.unit_price_cents, 0) !== order.total_cents) {
    throw new Error('A demo order total does not match its lines.')
  }
  return { ...order, lines: resolved }
})
