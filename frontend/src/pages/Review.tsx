import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Plan } from '../api/schemas'
import { ConfirmApproveDialog } from '../components/domain/ConfirmApproveDialog'
import { OrderBucket } from '../components/domain/OrderBucket'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'
import { usePlan } from '../hooks/usePlan'
import { useRecall } from '../hooks/useRecall'
import { formatCents } from '../lib/money'

const receiptSignature = (plan: Plan) => JSON.stringify([
  plan.total_refund_cents,
  plan.orders.filter(order => order.bucket === 'confirmed' && order.refund_cents > 0)
    .map(order => [order.order_id, order.refund_cents]).sort(([a], [b]) => String(a).localeCompare(String(b))),
])

export function Review() {
  const { recallId } = useParams()
  return recallId ? <ReviewRecall key={recallId} id={recallId} /> : null
}

function ReviewRecall({ id }: { id: string }) {
  const { data: plan, error, loading, reload, replace } = usePlan(id)
  const [dialog, setDialog] = useState(false)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [actionError, setActionError] = useState<unknown>(null)
  const { record, setLatest } = useRecall()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const scope = typeof location.state?.scope === 'string' ? location.state.scope : ''

  useEffect(() => {
    if (plan) record(id, 'plan', 'The sandbox returned the refund plan.')
  }, [id, plan, record])

  async function approve() {
    if (!plan || inFlight.current) return
    const approvedAt = new Date().toISOString()
    inFlight.current = true
    setBusy(true)
    setActionError(null)
    try {
      const { plan: fresh } = await api.plan(id)
      if (fresh.blocking_problems.length || receiptSignature(fresh) !== receiptSignature(plan)) {
        replace(fresh)
        setDialog(false)
        toast('The plan changed. Review the current amounts before approving.', 'warning')
        return
      }
      const { results } = await api.approve(id)
      record(id, 'approve', 'Merchant confirmed the sandbox refund request.', approvedAt)
      setLatest(id)
      if (results.length && results.every(row => row.already_existed && row.status === 'COMPLETED')) {
        toast('Already refunded. No duplicate created.', 'info')
      }
      navigate(`/result/${encodeURIComponent(id)}`)
    } catch (reason) {
      setActionError(reason)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section className="container-shell page review-page">
      <header className="page-header">
        <p className="eyebrow">Step 03 / Review and approval</p>
        <h1 className="heading-lg">Review the refund plan</h1>
        <p className="muted">Check the matched order lines and confirm the exact sandbox refund total.</p>
      </header>
      {error != null ? <AsyncFailure error={error} retry={reload} /> : !plan && loading ? <Skeleton label="Loading refund plan…" rows={6} /> : plan && (() => {
        const confirmed = plan.orders.filter(order => order.bucket === 'confirmed')
        const uncertain = plan.orders.filter(order => order.bucket === 'uncertain')
        const unaffected = plan.orders.filter(order => order.bucket === 'unaffected')
        const excluded = plan.orders.filter(order => order.bucket === 'excluded')
        const blocked = plan.blocking_problems.length > 0
        const total = formatCents(plan.total_refund_cents)
        return <>
          <div className="review-summary">
            <div className="row between"><h2>Recall plan{scope && ` · ${scope}`}</h2><span className="summary-tag"><Icon name="shield" /> Sandbox approval</span></div>
            <dl className="review-metrics">
              <div><dt>Confirmed</dt><dd><Icon name="check_circle" />{confirmed.length}</dd></div>
              <div><dt>Uncertain</dt><dd><Icon name="warning" />{uncertain.length}</dd></div>
              <div><dt>Unaffected</dt><dd><Icon name="remove_circle_outline" />{unaffected.length}</dd></div>
              <div className="review-total"><dt>Total refund</dt><dd className="amount">{total}</dd></div>
            </dl>
          </div>
          <div className="review-buckets stack">
            {blocked && <div className="notice-banner tone-failed" role="alert"><Icon name="error" /><div>
              <strong>Approval is blocked</strong>
              <ul className="list-disc pl-4">{plan.blocking_problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
            </div></div>}
            {!plan.orders.length ? <EmptyState title="No orders to review" description="Seed and capture demo orders to see a refund plan." action={<ButtonLink to="/setup">Go to demo setup</ButtonLink>} /> : <>
              <OrderBucket bucket="confirmed" orders={confirmed} />
              <OrderBucket bucket="uncertain" orders={uncertain} />
              <OrderBucket bucket="unaffected" orders={unaffected} />
              {excluded.length > 0 && <OrderBucket bucket="excluded" orders={excluded} />}
            </>}
          </div>
          <div className="sticky-actions">
            <div><span className="eyebrow">Total refund</span><strong className="heading-md amount">{total}</strong></div>
            <Button icon="payments" disabled={blocked || busy || plan.total_refund_cents <= 0} onClick={() => { setActionError(null); setDialog(true) }}>Approve refunds <span className="amount">· {total}</span></Button>
          </div>
          {dialog && <ConfirmApproveDialog plan={plan} busy={busy} error={actionError} clearError={() => setActionError(null)}
            onClose={() => setDialog(false)} onConfirm={() => void approve()} />}
        </>
      })()}
    </section>
  )
}
