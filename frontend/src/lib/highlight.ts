import type { Extraction } from '../api/schemas'

type Evidence = Extraction['evidence'][number]
export type Segment = { text: string; marks: { index: number; verified: boolean }[] }

export function splitEvidence(notice: string, evidence: Evidence[]): Segment[] {
  // Compare normalized whitespace without losing the positions in the original notice.
  const tokens = [...notice.matchAll(/\s+|./gsu)]
  const normalized = tokens.map(token => /^\s+$/.test(token[0]) ? ' ' : token[0].toLowerCase()).join('')
  const starts = tokens.flatMap(token => Array.from(
    { length: /^\s+$/.test(token[0]) ? 1 : token[0].toLowerCase().length },
    () => token.index,
  ))
  const ranges = evidence.flatMap(({ quote, verified }, index) => {
    const search = quote.trim().replace(/\s+/g, ' ').toLowerCase()
    if (!search) return []
    const position = normalized.indexOf(search)
    if (position < 0) return []
    return [{
      start: starts[position], end: starts[position + search.length] ?? notice.length,
      index, verified,
    }]
  })
  const boundaries = [...new Set([0, notice.length, ...ranges.flatMap(({ start, end }) => [start, end])])]
    .sort((a, b) => a - b)

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    return {
      text: notice.slice(start, end),
      marks: ranges.filter(range => range.start <= start && range.end >= end)
        .map(({ index, verified }) => ({ index, verified })),
    }
  })
}
