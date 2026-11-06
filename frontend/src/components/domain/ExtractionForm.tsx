import { useState } from 'react'
import type { Recall, RecallEdits } from '../../api/schemas'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

function inputsFor(recall: Recall) {
  return {
    sku: recall.sku ?? '', lot_prefix: recall.lot_prefix ?? '',
    lot_start: recall.lot_start?.toString() ?? '', lot_end: recall.lot_end?.toString() ?? '',
  }
}

export function hasCompleteLots(recall: Recall) {
  return recall.extraction.extra_lots.length > 0 || Boolean(recall.lot_prefix &&
    recall.lot_start !== null && recall.lot_end !== null && recall.lot_start <= recall.lot_end)
}

const fields = [
  { key: 'sku', label: 'Product SKU', evidence: ['sku'] },
  { key: 'lot_prefix', label: 'Lot prefix', evidence: ['lot_prefix', 'lot_range', 'lot_format'] },
  { key: 'lot_start', label: 'First lot number', evidence: ['lot_start'] },
  { key: 'lot_end', label: 'Last lot number', evidence: ['lot_end'] },
] as const

export function ExtractionForm({ recall, active, setActive, busy, onSave, onContinue }: {
  recall: Recall; active: number | null; setActive: (index: number | null) => void; busy: boolean;
  onSave: (edits: RecallEdits) => void; onContinue: () => void
}) {
  const [inputs, setInputs] = useState(() => inputsFor(recall))
  const [submitted, setSubmitted] = useState(false)
  const initial = inputsFor(recall)
  const dirty = fields.some(({ key }) => inputs[key].trim() !== initial[key])
  const { extra_lots: lots, evidence, confidence } = recall.extraction
  const sku = inputs.sku.trim()
  const prefix = inputs.lot_prefix.trim() || null
  const first = inputs.lot_start.trim()
  const last = inputs.lot_end.trim()
  const start = first ? Number(first) : null
  const end = last ? Number(last) : null
  const rangeRequired = !lots.length || Boolean(prefix || first || last)
  const errors: Partial<Record<keyof RecallEdits, string>> = {}
  if (!sku) errors.sku = 'Enter a product SKU.'
  if (rangeRequired && !prefix) errors.lot_prefix = 'Enter the lot prefix.'
  if (rangeRequired && start === null) errors.lot_start = 'Enter the first lot number.'
  if (rangeRequired && end === null) errors.lot_end = 'Enter the last lot number.'
  if (first && (!/^\d+$/.test(first) || !Number.isSafeInteger(start))) errors.lot_start = 'Use a whole number.'
  if (last && (!/^\d+$/.test(last) || !Number.isSafeInteger(end))) errors.lot_end = 'Use a whole number.'
  if (start !== null && end !== null && start > end && !errors.lot_start && !errors.lot_end) errors.lot_end = 'The last lot must be at or after the first lot.'

  function chips(names: readonly string[]) {
    return evidence.flatMap(({ field, verified }, index) => names.includes(field) ? [
      <button type="button" className={`evidence-chip ${verified ? '' : 'evidence-chip--unverified'} ${active === index ? 'evidence-chip--active' : ''}`}
        key={index} id={`evidence-chip-${index}`} onFocus={() => setActive(index)} onBlur={() => setActive(null)}
        onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}
        onClick={() => document.getElementById(`quote-${index}`)?.focus()}>
        <Icon name={verified ? 'check_circle' : 'warning'} /> {verified ? 'Verified in notice' : 'Unverified quote'} · {index + 1}
      </button>,
    ] : [])
  }

  function field({ key, label, evidence: names }: typeof fields[number]) {
    const error = submitted ? errors[key] : undefined
    return <div key={key} className="field">
      <label htmlFor={`extract-${key}`}>{label}</label>
      <input id={`extract-${key}`} className="input" value={inputs[key]} disabled={busy}
        inputMode={key === 'lot_start' || key === 'lot_end' ? 'numeric' : undefined}
        aria-invalid={Boolean(error)} aria-describedby={error ? `extract-${key}-error` : undefined}
        onChange={event => setInputs(current => ({ ...current, [key]: event.target.value }))} />
      {error && <span className="field-error" id={`extract-${key}-error`}>{error}</span>}
      {chips(names)}
    </div>
  }

  return (
    <Card className="stack">
      <div className="row between">
        <h2 className="heading-sm">Extracted recall details</h2>
        <Badge tone={confidence === 'high' ? 'confirmed' : 'uncertain'} icon={confidence === 'high' ? 'check_circle' : 'warning'}>Confidence · {confidence}</Badge>
      </div>
      <form className="stack" onSubmit={event => {
        event.preventDefault()
        setSubmitted(true)
        if (!Object.keys(errors).length) onSave({ sku, lot_prefix: prefix, lot_start: start, lot_end: end })
      }}>
        {field(fields[0])}
        <label className="field">Product from catalog
          <input className="input" readOnly value={recall.catalog_match?.name ?? ''} placeholder="No catalog match" />
        </label>
        {recall.catalog_match ? <Badge tone="confirmed" icon="check_circle">Catalog match · {recall.catalog_match.sku}</Badge>
          : <div className="notice-banner tone-failed" role="alert"><Icon name="error" /><div><strong>SKU not found in the catalog</strong><p>Enter a catalog SKU and save your edit before continuing.</p></div></div>}
        {!hasCompleteLots(recall) && <div className="notice-banner tone-uncertain"><Icon name="warning" /><div><strong>Incomplete lot range</strong><p>Verify the missing prefix or lot bounds with the supplier, then enter them here.</p></div></div>}
        <div className="lot-fields">{fields.slice(1).map(field)}</div>
        {lots.length > 0 && <div className="field"><span>Listed lots</span><div className="row">{lots.map(lot => <Badge key={lot}>{lot}</Badge>)}</div>{chips(['extra_lots'])}</div>}
        {recall.extraction.ambiguities.length > 0 && <div className="notice-banner tone-uncertain">
          <Icon name="warning" /><div><strong>Details to verify</strong><ul className="list-disc space-y-1 pl-4 pt-1">{recall.extraction.ambiguities.map((ambiguity, index) => <li key={index}>{ambiguity}</li>)}</ul>{chips(['batch_date'])}</div>
        </div>}
        {chips([...new Set(evidence.map(item => item.field))].filter(name => !['extra_lots', 'batch_date', ...fields.flatMap(item => [...item.evidence])].includes(name)))}
        <div className="row form-actions">
          <Button type="submit" variant="secondary" icon="save" busy={busy} disabled={!dirty}>Save edits</Button>
          <Button icon="arrow_forward" disabled={busy || dirty || !recall.catalog_match || !hasCompleteLots(recall)} onClick={onContinue}>Continue to review</Button>
        </div>
      </form>
    </Card>
  )
}
