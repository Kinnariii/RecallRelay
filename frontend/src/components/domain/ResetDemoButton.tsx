import { useState } from 'react'
import { api } from '../../api'
import { friendlyError, isWaking } from '../../api/client'
import type { Order } from '../../api/schemas'
import { useRecall } from '../../hooks/useRecall'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ServerWaking } from '../../pages/ServerWaking'
import { useToast } from '../ui/ToastProvider'

export function ResetDemoButton({ onReset, disabled }: { onReset: (orders: Order[]) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { clear } = useRecall()
  const toast = useToast()

  async function reset() {
    setBusy(true)
    setError(null)
    try {
      const { orders } = await api.reset()
      clear()
      setOpen(false)
      toast('Demo reset. Fresh orders are ready.', 'success')
      onReset(orders)
    } catch (reason) {
      setError(reason)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="ghost" icon="restart_alt" disabled={disabled} onClick={() => { setError(null); setOpen(true) }}>Reset demo</Button>
      {open && <Modal title="Reset the demo?" onClose={() => setOpen(false)} busy={busy}>
        <p className="muted">This clears the demo history and starts with three fresh orders.</p>
        {error != null && (isWaking(error) ? <div className="mt-3"><ServerWaking onReady={() => setError(null)} /></div>
          : <p className="field-error mt-3" role="alert">{friendlyError(error)}</p>)}
        <div className="modal-actions">
          <Button variant="secondary" data-initial-focus disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger-safe" busy={busy} disabled={isWaking(error)} onClick={() => void reset()}>{busy ? 'Resetting…' : 'Reset demo'}</Button>
        </div>
      </Modal>}
    </>
  )
}
