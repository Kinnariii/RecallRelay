import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ApiError, isWaking } from '../api/client'
import type { Recall, RecallEdits } from '../api/schemas'
import { EvidenceHighlight } from '../components/domain/EvidenceHighlight'
import { ExtractionForm } from '../components/domain/ExtractionForm'
import { SampleNoticePicker } from '../components/domain/SampleNoticePicker'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'
import { useRecall } from '../hooks/useRecall'
import { samples } from '../lib/sampleNotices'

const aiSteps = [
  ['Find the product SKU', 'Identify the product mentioned in the supplier notice.'],
  ['Read the affected lots', 'Find the range or list of lots named in the notice.'],
  ['Quote the evidence', 'Check that the supporting quotes appear in the original notice.'],
]

export function Notice() {
  const [text, setText] = useState('')
  const [sample, setSample] = useState('')
  const [recall, setRecall] = useState<Recall>()
  const [active, setActive] = useState<number | null>(null)
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
    setText(index ? samples[Number(index)].text : '')
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
    if (!text.trim() || busy) return
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
    <section className="container-shell page">
      <header className="page-header">
        <p className="eyebrow">Step 02 / Supplier notice</p>
        <h1 ref={heading} tabIndex={-1} className="heading-lg">{recall ? 'Verify recall notice extraction' : extracting ? 'Extracting recall details…' : 'Upload the supplier recall notice'}</h1>
        <p className="muted">{recall ? 'Check the evidence and correct the SKU or lot details before reviewing refunds.' : 'Paste a notice, upload a plain text file, or choose a sample to try the demo.'}</p>
      </header>
      {error != null && <div className="mb-5">
        {extractionError ? <div className="stack">
          <ErrorState error={error} title="We couldn’t extract the recall details" retry={() => void extract()} />
          <Button variant="secondary" icon="edit" onClick={pasteRaw}>Paste raw text</Button>
        </div> : <AsyncFailure error={error} retry={recall ? undefined : () => void extract()}
          onReady={isWaking(error) ? () => setError(null) : undefined} />}
      </div>}
      {recall ? (
        <div className="split-layout">
          <div className="stack">
            <EvidenceHighlight notice={recall.notice_text} evidence={recall.extraction.evidence} active={active} setActive={setActive} />
            <Button variant="ghost" icon="arrow_back" disabled={Boolean(busy)} onClick={() => { setRecall(undefined); setError(null); setActive(null) }}>Back to notice text</Button>
          </div>
          <ExtractionForm key={recall.id} recall={recall} active={active} setActive={setActive} busy={busy === 'save'}
            onSave={edits => void save(edits)} onContinue={() => navigate(`/review/${encodeURIComponent(recall.id)}`, { state: { scope } })} />
        </div>
      ) : (
        <div className="split-layout">
          <div className="stack">
            <Card>
              <div className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
                onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={event => { event.preventDefault(); void openFile(event.dataTransfer.files[0]) }}>
                <span className="icon-tile"><Icon name="cloud_upload" /></span>
                <h2 className="heading-sm">Drop a .txt supplier recall notice</h2>
                <p className="muted text-sm">Choose a plain text file from your device.</p>
                <input type="file" hidden ref={fileInput} accept=".txt,text/plain" onChange={event => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  void openFile(file)
                }} />
                <Button variant="secondary" icon="attach_file" busy={busy === 'file'} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>Browse files</Button>
                {fileError && <p className="field-error" role="alert">{fileError}</p>}
              </div>
            </Card>
            <Card className="stack">
              <SampleNoticePicker value={sample} onSelect={pickSample} disabled={Boolean(busy)} />
              <div className="editor">
                <div className="row between">
                  <label htmlFor="notice-text" className="eyebrow">Notice text</label>
                  <Button variant="ghost" icon="backspace" disabled={!text || Boolean(busy)} onClick={() => {
                    setText(''); setError(null); setFileError(''); editor.current?.focus()
                  }}>Clear</Button>
                </div>
                <textarea id="notice-text" ref={editor} value={text} readOnly={Boolean(busy)} rows={10}
                  placeholder="Paste the supplier’s recall notice here…"
                  onChange={event => { setText(event.target.value); setError(null) }} />
              </div>
              <div className="row between">
                <p className="muted text-xs amount">{text.length.toLocaleString()} characters · {text ? text.split(/\r\n|\r|\n/).length : 0} lines</p>
                <div className="row">
                  <Button variant="secondary" disabled={Boolean(busy)} onClick={() => pickSample(sample || '0')}>Reset Sample</Button>
                  <Button icon="auto_awesome" busy={extracting} disabled={!text.trim() || Boolean(busy)} onClick={() => void extract()}>
                    {extracting ? 'Extracting…' : 'Extract with AI'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          <aside className="stack">
            {extracting ? <Card className="stack" aria-live="polite">
              <div className="card-title"><span className="icon-tile"><Icon name="auto_awesome" /></span><h2 className="heading-sm">Extraction progress</h2></div>
              <ol className="ai-list">
                <li><Icon name="check_circle" /><div><strong>Reading notice</strong><p>Notice text is ready.</p></div></li>
                <li aria-current="step"><Icon name="progress_activity" className="spin" /><div><strong>Extracting fields</strong><p>Waiting for the extraction response.</p></div></li>
                <li><Icon name="radio_button_unchecked" /><div><strong>Verifying evidence</strong><p>Verification results come with the extracted fields.</p></div></li>
              </ol>
              <Skeleton label="Waiting for extracted fields…" rows={3} />
            </Card> : <Card className="stack">
              <div className="card-title"><span className="icon-tile"><Icon name="psychology" /></span><h2 className="heading-sm">What AI will do</h2></div>
              <ul className="ai-list">{aiSteps.map(([title, detail]) => <li key={title}><Icon name="check_circle" /><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ul>
            </Card>}
            <div className="notice-banner tone-pending"><Icon name="info" /><div><strong>AI extracts only</strong><p>The refund plan uses captured order lines. You review and approve the amount before refunds are issued.</p></div></div>
          </aside>
        </div>
      )}
    </section>
  )
}
