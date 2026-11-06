import type { Extraction } from '../types.js'

export type LotScope = Pick<Extraction, 'lot_prefix' | 'lot_start' | 'lot_end' | 'extra_lots'>

export function parseLot(lot: string | null) {
  const match = /^([A-Za-z]+-)(\d+)$/.exec(lot?.trim() ?? '')
  if (!match) return null
  const number = Number(match[2])
  return Number.isSafeInteger(number) ? { prefix: match[1], number } : null
}

export function completeRange(scope: LotScope) {
  const { lot_prefix: prefix, lot_start: start, lot_end: end } = scope
  return prefix && start !== null && end !== null && start <= end ? { prefix, start, end } : null
}

export function lotInRecall(lot: string | null, scope: LotScope): 'affected' | 'unaffected' | 'uncertain' {
  if (lot && scope.extra_lots.includes(lot)) return 'affected'
  const parsed = parseLot(lot)
  if (!parsed) return 'uncertain'

  const range = completeRange(scope)
  if (range && parsed.prefix === range.prefix) {
    return parsed.number >= range.start && parsed.number <= range.end ? 'affected' : 'unaffected'
  }
  return scope.extra_lots.some(item => parseLot(item)?.prefix === parsed.prefix) ? 'unaffected' : 'uncertain'
}
