import type { Extraction } from '../api/schemas'
import seed from '../../../data/seed.json'

export function mockExtract(notice: string): Extraction {
  const sku = /\bSKU\s*[:#]?\s*([A-Z0-9]+-[A-Z0-9]+)\b/i.exec(notice)
  const range = /\b([A-Z]+-)(\d+)\s*(?:through|to|–|—)\s*\1(\d+)\b/i.exec(notice)
  const start = /\bstart(?:s|ing)?\s+at\s+(([A-Z]+-)(\d+))\b/i.exec(notice)
  const list = /\b([A-Z]+-\d+(?:,\s*[A-Z]+-\d+)+)\b/i.exec(notice)
  const ambiguousLot = /Lot #B200~250-exp/i.exec(notice)
  const batchDate = /Nov\/Dec 2026 batch/i.exec(notice)
  const product = sku && seed.catalog.find(item => item.sku === sku[1].toUpperCase())
  const ambiguities: string[] = []
  if (!sku) ambiguities.push('The notice does not identify a product SKU.')
  if (ambiguousLot) ambiguities.push('The supplier’s lot label needs a standard prefix and numeric bounds.')
  if (batchDate) ambiguities.push('The batch date could refer to either month. Verify the final lot with the supplier.')
  if (!range && !list) ambiguities.push('The notice does not give a complete lot range.')

  const evidence = [
    { field: 'sku', quote: sku?.[0] },
    { field: 'lot_range', quote: range?.[0] },
    { field: 'lot_start', quote: start?.[1] },
    { field: 'extra_lots', quote: list?.[0] },
    { field: 'lot_format', quote: ambiguousLot?.[0] },
    { field: 'batch_date', quote: batchDate?.[0] },
  ].flatMap(({ field, quote }) => quote ? [{ field, quote, verified: true }] : [])
  if (ambiguousLot) evidence.push({ field: 'lot_range', quote: 'B-200 through B-250', verified: false })

  return {
    sku: sku?.[1].toUpperCase() ?? null,
    product_name: product ? product.name : sku?.[1].toUpperCase() === 'PB-500' ? 'Brindle Organic Crunch Peanut Butter 500g' : null,
    lot_prefix: (range?.[1] ?? start?.[2])?.toUpperCase() ?? null,
    lot_start: range ? Number(range[2]) : start ? Number(start[3]) : null,
    lot_end: range ? Number(range[3]) : null,
    extra_lots: list ? list[1].split(/,\s*/) : [],
    evidence, ambiguities,
    confidence: !sku || ambiguousLot ? 'low' : ambiguities.length ? 'medium' : 'high',
  }
}
