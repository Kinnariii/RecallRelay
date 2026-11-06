import type { Extraction, ModelExtraction } from '../types.js'

const normalize = (text: string) => text.trim().replace(/\s+/gu, ' ').toLowerCase()

export function verifyEvidence(notice: string, evidence: ModelExtraction['evidence']): Extraction['evidence'] {
  const searchable = normalize(notice)
  return evidence.map(item => {
    const quote = normalize(item.quote)
    return { ...item, verified: Boolean(quote && searchable.includes(quote)) }
  })
}
