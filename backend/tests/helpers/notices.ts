import { readFileSync } from 'node:fs'
import type { ModelExtraction } from '../../src/types.js'

export const notice = (n: number) => readFileSync(new URL(
  `../../../data/sample-notices/notice-${String(n).padStart(2, '0')}.txt`, import.meta.url,
), 'utf8')

const base: ModelExtraction = {
  sku: 'PB-340', product_name: 'Brindle Creamy Peanut Butter 340g',
  lot_prefix: 'B-', lot_start: 200, lot_end: 250, extra_lots: [], ambiguities: [],
  evidence: [{ field: 'sku', quote: '(SKU PB-340)' }, { field: 'lot_range', quote: 'B-200 through B-250' }],
  confidence: 'high',
}

export const sampleExtractions: ModelExtraction[] = [
  base,
  {
    ...base, lot_prefix: null, lot_start: null, lot_end: null, extra_lots: ['B-101', 'B-104', 'B-112'],
    evidence: [{ field: 'extra_lots', quote: 'B-101, B-104, B-112' }],
  },
  {
    ...base, sku: 'PB-500', product_name: 'Brindle Organic Crunch Peanut Butter 500g',
    evidence: [{ field: 'sku', quote: '(SKU PB-500)' }, { field: 'lot_range', quote: 'B-200 to B-250' }],
  },
  {
    ...base, lot_prefix: null, lot_start: null, lot_end: null, confidence: 'low',
    evidence: [{ field: 'lot_format', quote: 'Lot #B200~250-exp' }, { field: 'lot_range', quote: 'B-200 through B-250' }],
    ambiguities: ['Unfamiliar lot format.'],
  },
  {
    ...base, lot_end: null, confidence: 'medium',
    evidence: [{ field: 'batch_date', quote: 'Nov/Dec 2026 batch' }, { field: 'lot_start', quote: 'B-200' }],
    ambiguities: ['The final lot is missing.'],
  },
]
