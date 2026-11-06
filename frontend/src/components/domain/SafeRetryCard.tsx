import { useRef, useState } from 'react'
import type { RefundRow } from '../../api/schemas'
import { AsyncFailure } from '../ui/AsyncFailure'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/ToastProvider'

export function SafeRetryCard({ approve, disabled }: { approve: () => Promise<RefundRow[]>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const running = useRef(false)
  const toast = useToast()

  async function repeat() {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError(null)
    try {
      const rows = await approve()
      if (rows.length && rows.every(row => row.already_existed && row.status === 'COMPLETED')) {
        toast('Already refunded. No duplicate created.', 'info')
      } else if (rows.length && rows.every(row => row.already_existed)) {
        toast('Existing refund requests returned. No duplicate created.', 'info')
      } else {
        toast('Refund status updated.', 'info')
      }
    } catch (reason) {
      setError(reason)
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return (
    <Card className="stack">
      <div className="row between">
        <div className="card-title"><span className="icon-tile"><Icon name="shield" /></span><div>
          <h2 className="heading-sm">Safe repeat approval</h2>
          <p className="muted text-sm">Approving the same recall again returns its existing refund requests.</p>
        </div></div>
        <Button variant="secondary" icon="replay" busy={busy} disabled={disabled} onClick={() => void repeat()}>Approve again</Button>
      </div>
      {error != null && <AsyncFailure error={error} onReady={() => setError(null)} />}
    </Card>
  )
}
