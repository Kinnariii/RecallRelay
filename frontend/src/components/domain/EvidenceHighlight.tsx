import { useMemo, type CSSProperties } from 'react'
import type { Extraction } from '../../api/schemas'
import { splitEvidence } from '../../lib/highlight'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

type Evidence = Extraction['evidence']
export type EvidenceState = {
  active: number | null
  onHover: (index: number | null) => void
  onFocus: (index: number | null) => void
}

export function EvidenceHighlight({ notice, evidence, active, onHover, onFocus }: {
  notice: string; evidence: Evidence
} & EvidenceState) {
  const segments = useMemo(() => splitEvidence(notice, evidence), [notice, evidence])
  const seen = new Set<number>()
  function marker(index: number, verified: boolean) {
    return <button type="button" key={index} id={`quote-${index}`} className="evidence-index"
      aria-label={`Quote ${index + 1}, ${verified ? 'verified' : 'unverified'}`}
      onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}
      onFocus={() => onFocus(index)} onBlur={() => onFocus(null)}
      onClick={() => document.getElementById(`evidence-chip-${index}`)?.focus()}><span>{index + 1}</span></button>
  }

  return (
    <Card className="stack evidence-card">
      <div className="card-title"><span className="icon-tile"><Icon name="description" /></span><div>
        <h2 className="heading-sm">Notice and supporting quotes</h2>
        <p className="muted text-sm">Select a number to find the matching field.</p>
      </div></div>
      <div className="notice-document">
        {segments.map(({ text, marks }, index) => {
          if (!marks.length) return <span key={index}>{text}</span>
          const newMarks = marks.filter(mark => !seen.has(mark.index))
          newMarks.forEach(mark => seen.add(mark.index))
          const verified = marks.some(mark => mark.verified)
          const selected = active !== null && marks.some(mark => mark.index === active)
          return <span key={index}>
            {newMarks.map(mark => marker(mark.index, mark.verified))}
            <mark className={`quote ${verified ? 'quote-verified' : 'quote-unverified'} ${selected ? 'quote-active' : ''}`}
              style={{ '--quote-delay': `${Math.min(marks[0].index, 8) * 75}ms` } as CSSProperties}
              onMouseEnter={() => onHover(marks[0].index)} onMouseLeave={() => onHover(null)}>{text}</mark>
          </span>
        })}
      </div>
      {evidence.some((item, index) => !item.verified && !seen.has(index)) && <div className="unmatched-evidence">
        <h3 className="heading-sm">Quotes to check</h3>
        <ul className="stack">
          {evidence.flatMap((item, index) => item.verified || seen.has(index) ? [] : [<li key={index} className={`unverified-quote ${active === index ? 'quote-active' : ''}`}>{marker(index, false)} “{item.quote}”</li>])}
        </ul>
      </div>}
    </Card>
  )
}
