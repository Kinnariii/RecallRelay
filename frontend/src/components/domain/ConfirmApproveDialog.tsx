import { useState } from 'react'
import { isWaking, friendlyError } from '../../api/client'
import type { Plan } from '../../api/schemas'
import { formatCents } from '../../lib/money'
import { ServerWaking } from '../../pages/ServerWaking'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

export function ConfirmApproveDialog({ plan, onClose, onConfirm, busy, error, clearError }: {
  plan: Plan; onClose: () => void; onConfirm: () => void; busy?: boolean; error?: unknown; clearError?: () => void
}) {
  const [checked, setChecked] = useState(false)
  const total = formatCents(plan.total_refund_cents)
  const orders = plan.orders.filter(order => order.bucket === 'confirmed' && order.refund_cents > 0)
  return (
    <Modal title="Approve sandbox refunds?" onClose={onClose} busy={busy}>
      <form onSubmit={event => { event.preventDefault(); if (checked && !busy) onConfirm() }}>
        <p className="muted">You’re approving <strong className="amount">{total}</strong> in sandbox refunds. Review the amount for each eligible order.</p>
        <div className="receipt">
          <ul>{orders.map(order => <li key={order.order_id}>
            <span><strong>{order.customer_name}</strong><small>{order.order_id}</small></span>
            <strong className="amount">{formatCents(order.refund_cents)}</strong>
          </li>)}</ul>
          <div className="receipt-total"><span>Total refund</span><strong className="amount">{total}</strong></div>
        </div>
        <label className="confirm-checkbox">
          <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} disabled={busy} />
          <span>I understand this issues a sandbox refund</span>
        </label>
        {error != null && (isWaking(error)
          ? <div className="mt-3"><ServerWaking onReady={clearError} /></div>
          : <p className="field-error mt-3" role="alert">{friendlyError(error)}</p>)}
        {busy && <p role="status" className="row muted mt-3 text-sm"><Icon name="sync" className="spin" />Talking to PayPal sandbox…</p>}
        <div className="modal-actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" icon="payments" busy={busy} disabled={!checked || isWaking(error)}>Approve and refund {total}</Button>
        </div>
      </form>
    </Modal>
  )
}
