import { useMemo } from 'react'
import type { Extraction } from '../../api/schemas'
import { splitEvidence } from '../../lib/highlight'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

type Evidence = Extraction['evidence']

export function EvidenceHighlight({ notice, evidence, active, setActive }: {
  notice: string; evidence: Evidence; active: number | null; setActive: (index: number | null) => void
}) {
  const segments = useMemo(() => splitEvidence(notice, evidence), [notice, evidence])
  const seen = new Set<number>()
  return (
    <Card className="stack evidence-card">
      <div className="card-title"><span className="icon-tile"><Icon name="description" /></span><div>
        <h2 className="heading-sm">Supplier notice with evidence</h2>
        <p className="muted text-sm">Numbered highlights link the quotes to the extracted fields.</p>
      </div></div>
      <div className="notice-document">
        {segments.map(({ text, marks }, index) => {
          if (!marks.length) return <span key={index}>{text}</span>
          const newMarks = marks.filter(mark => !seen.has(mark.index))
          newMarks.forEach(mark => seen.add(mark.index))
          const verified = marks.some(mark => mark.verified)
          const selected = active !== null && marks.some(mark => mark.index === active)
          return <span key={index}>
            {newMarks.map(mark => <button type="button" key={mark.index} id={`quote-${mark.index}`} className="evidence-index"
              aria-label={`Evidence ${mark.index + 1}${mark.verified ? ', verified' : ', unverified'}`}
              onMouseEnter={() => setActive(mark.index)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(mark.index)} onBlur={() => setActive(null)}
              onClick={() => document.getElementById(`evidence-chip-${mark.index}`)?.focus()}>{mark.index + 1}</button>)}
            <mark className={`quote ${verified ? 'quote-verified' : 'quote-unverified'} ${selected ? 'quote-active' : ''}`}
              onMouseEnter={() => setActive(marks[0].index)} onMouseLeave={() => setActive(null)}>{text}</mark>
          </span>
        })}
      </div>
      {evidence.some(item => !item.verified) && <div className="notice-banner tone-uncertain">
        <Icon name="warning" />
        <div><strong>Unverified evidence</strong>
          <p>These quotes could not be verified against the notice. Check the supplier’s wording before you continue.</p>
          <ul className="mt-2 space-y-1">
            {evidence.flatMap((item, index) => item.verified ? [] : [<li key={index} className="unverified-quote"><span className="evidence-index">{index + 1}</span> “{item.quote}”</li>])}
          </ul>
        </div>
      </div>}
    </Card>
  )
}
