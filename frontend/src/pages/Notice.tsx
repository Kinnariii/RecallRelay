import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ApiError, isWaking } from '../api/client'
import type { Recall, RecallEdits } from '../api/schemas'
import { EvidenceHighlight } from '../components/domain/EvidenceHighlight'
import { ExtractionForm } from '../components/domain/ExtractionForm'
import { SampleNoticePicker } from '../components/domain/SampleNoticePicker'
import { DemoCoach } from '../components/layout/DemoCoach'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { Icon } from '../components/ui/Icon'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'
import { useRecall } from '../hooks/useRecall'
import { samples } from '../lib/sampleNotices'

const aiSteps = [
  ['Find the product code', 'Read the SKU named by the supplier.'],
  ['Find the affected lots', 'Read the range or list of lot numbers.'],
  ['Show the supporting quotes', 'Point to the words in the original notice.'],
]
const noticeLimit = 20_000

export function Notice() {
  const [text, setText] = useState('')
  const [sample, setSample] = useState('')
  const tooLong = text.length > noticeLimit
  const [recall, setRecall] = useState<Recall>()
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const evidenceState = { active: hovered ?? focused, onHover: setHovered, onFocus: setFocused }
  const [busy, setBusy] = useState<'file' | 'extract' | 'save' | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const editor = useRef<HTMLTextAreaElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const { record } = useRecall()

  function pickSample(index: string) {
    setSample(index)
    if (index) setText(samples[Number(index)].text)
    setError(null)
    setFileError('')
  }

  async function openFile(file?: File) {
    setDragging(false)
    if (!file || busy) return
    setFileError('')
    if (!/\.txt$/i.test(file.name)) {
      setFileError('Choose a plain text (.txt) file.')
      return
    }
    setBusy('file')
    try {
      const contents = await file.text()
      if (!contents.trim()) {
        setFileError('This text file is empty. Choose another file or paste a notice.')
        return
      }
      if (contents.length > noticeLimit) {
        setFileError('This notice is longer than 20,000 characters. Upload a shorter file or paste the relevant section.')
        return
      }
      setSample('')
      setText(contents)
      setError(null)
    } catch {
      setFileError('This file couldn’t be opened. Try another file or paste its text.')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function extract() {
    if (!text.trim() || tooLong || busy) return
    const uploaded = new Date().toISOString()
    setBusy('extract')
    setError(null)
    try {
      const { recall: next } = await api.extract(text)
      record(next.id, 'upload', 'Supplier notice submitted.', uploaded)
      record(next.id, 'extract', `Extraction returned with ${next.extraction.confidence} confidence.`)
      setRecall(next)
      requestAnimationFrame(() => heading.current?.focus())
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(null)
    }
  }

  async function save(edits: RecallEdits) {
    if (!recall || busy) return
    setBusy('save')
    setError(null)
    try {
      const { recall: next } = await api.updateRecall(recall.id, edits)
      setRecall(next)
      record(next.id, 'edit', 'Merchant saved changes to the extracted fields.')
      await api.plan(next.id)
      record(next.id, 'plan', 'The sandbox returned an updated plan.')
      toast('Recall edits saved.', 'success')
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(null)
    }
  }

  function pasteRaw() {
    setError(null)
    editor.current?.focus()
  }

  const extractionError = error instanceof ApiError && error.code === 'EXTRACTION_FAILED'
  const extracting = busy === 'extract'
  const scope = recall && [recall.sku, recall.lot_prefix && recall.lot_start !== null && recall.lot_end !== null
    ? 'Lots ' + recall.lot_prefix + recall.lot_start + ' to ' + recall.lot_prefix + recall.lot_end
    : recall.extraction.extra_lots.join(', ')].filter(Boolean).join(' · ')
  return (
    <section className="container-shell page notice-page">
      <SectionHeader eyebrow="Step 2 · Supplier notice" headingRef={heading}
        title={recall ? 'Check the product and lots' : 'Upload the supplier recall notice'}
        description={recall ? 'Compare the extracted details with the numbered quotes.' : 'Try the sample, paste your notice, or upload a text file.'} />
      <DemoCoach hint={recall ? 'Check the highlighted quotes against the product and lot details before reviewing orders.' : 'Use the sample or paste a notice so AI can find the recalled product and lots.'}
        action={recall ? 'Find next step' : text.trim() && !tooLong ? 'Find extraction' : 'Find the sample'}
        targets={busy ? [] : recall ? ['continue-extraction', 'save-extraction', 'extracted-details'] : [text.trim() && !tooLong ? 'extract-notice' : 'sample-notice-1']} />
      {error != null && <div className="mb-4">
        {extractionError ? <div className="stack">
          <ErrorState error={error} title="We couldn’t read this notice" retry={() => void extract()} />
          <Button variant="secondary" icon="edit" onClick={pasteRaw}>Edit notice text</Button>
        </div> : <AsyncFailure error={error} retry={recall ? undefined : () => void extract()}
          onReady={isWaking(error) ? () => setError(null) : undefined} />}
      </div>}
      {recall ? (
        <div className="split-layout">
          <div className="stack">
            <EvidenceHighlight notice={recall.notice_text} evidence={recall.extraction.evidence} {...evidenceState} />
            <div className="row">
              <Button variant="ghost" icon="arrow_back" disabled={Boolean(busy)} onClick={() => {
                setRecall(undefined); setError(null); setHovered(null); setFocused(null)
                requestAnimationFrame(() => heading.current?.focus())
              }}>Edit notice text</Button>
              <Button className="jump-to-fields" variant="secondary" icon="arrow_downward"
                onClick={() => document.getElementById('extracted-details')?.focus()}>Go to extracted details</Button>
            </div>
          </div>
          <ExtractionForm key={recall.id} recall={recall} {...evidenceState} busy={busy === 'save'}
            onSave={edits => void save(edits)} onContinue={() => navigate(`/review/${encodeURIComponent(recall.id)}`, { state: { scope } })} />
        </div>
      ) : (
        <div className="split-layout">
          <Card className="stack notice-editor-card">
            <div className="sample-shortcut">
              <div className="card-title"><span className="icon-tile"><Icon name="description" /></span><div>
                <h2 className="heading-sm">Try a sample recall</h2>
                <p className="muted text-sm">Start with a notice that matches the demo orders.</p>
              </div></div>
              <Button id="sample-notice-1" variant={text.trim() ? 'secondary' : 'primary'} icon="description" disabled={Boolean(busy)}
                onClick={() => { pickSample('0'); requestAnimationFrame(() => document.getElementById('extract-notice')?.focus()) }}>Use sample notice 1</Button>
            </div>
            <div className="editor"
              onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={event => { event.preventDefault(); void openFile(event.dataTransfer.files[0]) }}>
              <div className="row between">
                <label htmlFor="notice-text" className="field">Notice text</label>
                <div className="row editor-tools">
                  <input type="file" hidden ref={fileInput} accept=".txt,text/plain" onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void openFile(file)
                  }} />
                  <Button variant="ghost" icon="attach_file" busy={busy === 'file'} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>Upload .txt</Button>
                  <Button variant="ghost" disabled={!text || Boolean(busy)} onClick={() => {
                    setText(''); setSample(''); setError(null); setFileError(''); editor.current?.focus()
                  }}>Clear</Button>
                </div>
              </div>
              <textarea id="notice-text" ref={editor} value={text} readOnly={Boolean(busy)} rows={8}
                aria-invalid={tooLong || undefined} aria-describedby={tooLong ? 'notice-length-error' : undefined}
                className={dragging ? 'dropzone-active' : undefined}
                placeholder="Paste the supplier’s recall notice here…"
                onChange={event => { setText(event.target.value); setError(null) }} />
              {fileError && <p className="field-error" role="alert">{fileError}</p>}
              {tooLong && <p className="field-error" id="notice-length-error">This notice is longer than 20,000 characters. Paste the relevant section before extracting.</p>}
            </div>
            <div className="row between notice-extract-actions">
              <p className="muted text-sm amount">{text.length.toLocaleString()} of 20,000 characters</p>
              <Button id="extract-notice" variant={text.trim() && !tooLong && !error ? 'primary' : 'secondary'} icon="auto_awesome" busy={extracting}
                disabled={!text.trim() || tooLong || Boolean(busy)} onClick={() => void extract()}>{extracting ? 'Reading notice…' : 'Extract with AI'}</Button>
            </div>
            <div className="extraction-live" aria-live="polite">
              {extracting && <p className="notice-banner tone-pending"><Icon name="schedule" /><span>Reading the notice and checking quotes…</span></p>}
            </div>
            <SampleNoticePicker value={sample} onSelect={pickSample} disabled={Boolean(busy)} />
          </Card>
          <aside className="stack">
            {extracting ? <Skeleton label="Waiting for product and lot details…" variant="fields" /> : <Card className="stack">
              <div className="card-title"><span className="icon-tile"><Icon name="psychology" /></span><h2 className="heading-sm">What AI will do</h2></div>
              <ul className="ai-list">{aiSteps.map(([title, detail]) => <li key={title}><Icon name="check_circle" /><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ul>
            </Card>}
            <div className="notice-banner tone-pending"><Icon name="info" /><div><strong>You decide what to refund</strong><p>AI reads the notice. The order data determines the amount, and you approve it.</p></div></div>
          </aside>
        </div>
      )}
    </section>
  )
}
