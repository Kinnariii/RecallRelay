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
    <Card className="stack repeat-approval">
      <div className="row between">
        <div className="card-title"><span className="icon-tile"><Icon name="shield" /></span><div>
          <h2 className="heading-sm">See why it’s safe to approve again</h2>
          <p className="muted text-sm">The same recall returns the original refund.</p>
        </div></div>
        <Button id="approve-again" icon="replay" busy={busy} disabled={disabled} onClick={() => void repeat()}>Approve again</Button>
      </div>
      {error != null && <AsyncFailure error={error} onReady={() => setError(null)} />}
    </Card>
  )
}
