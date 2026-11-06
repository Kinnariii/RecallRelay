import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { Plan } from '../api/schemas'
import { ConfirmApproveDialog } from '../components/domain/ConfirmApproveDialog'
import { OrderBucket } from '../components/domain/OrderBucket'
import { DemoCoach } from '../components/layout/DemoCoach'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Money } from '../components/ui/Money'
import { SectionHeader } from '../components/ui/SectionHeader'
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
  const heading = <SectionHeader eyebrow="Step 3 · Review and approval" title="Review the refund plan" />

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
      {error != null || !plan ? <div className="review-scroll">
        {heading}
        {error != null ? <AsyncFailure error={error} retry={reload} /> : loading && <Skeleton label="Loading refund plan…" variant="review" />}
      </div> : (() => {
        const confirmed = plan.orders.filter(order => order.bucket === 'confirmed')
        const uncertain = plan.orders.filter(order => order.bucket === 'uncertain')
        const unaffected = plan.orders.filter(order => order.bucket === 'unaffected')
        const excluded = plan.orders.filter(order => order.bucket === 'excluded')
        const blocked = plan.blocking_problems.length > 0
        const total = formatCents(plan.total_refund_cents)
        const refundable = blocked ? 0 : confirmed.filter(order => order.refund_cents > 0).length
        const singleRefund = refundable === 1 ? confirmed.find(order => order.refund_cents > 0) : undefined
        const sentence = `${refundable} ${refundable === 1 ? 'order' : 'orders'} to refund, ${uncertain.length} ${uncertain.length === 1 ? 'needs' : 'need'} your review, ${unaffected.length} ${unaffected.length === 1 ? 'is' : 'are'} not affected.`
        return <>
          <div className="review-scroll" role="region" aria-label="Refund plan and orders" tabIndex={0}>
            {heading}
            <DemoCoach hint={singleRefund ? `${singleRefund.customer_name} gets ${formatCents(singleRefund.refund_cents)} of ${formatCents(singleRefund.total_cents)}, and orders that need review stay untouched.`
              : 'Check the affected items and total before approving any refunds.'}
              action={refundable ? 'Find approval' : 'Find review details'} targets={['approve-refunds', 'review-blockers', 'review-summary']} />
            <div className="review-summary" id="review-summary" tabIndex={-1}>
              <div className="review-summary-copy">
                <p className="summary-tag"><Icon name="fact_check" /> Recall plan{scope && ` · ${scope}`}</p>
                <h2>{sentence}</h2>
                {excluded.length > 0 && <p className="summary-tag">{excluded.length} excluded from refunds</p>}
              </div>
              <div className="review-total"><span>Total refund</span><Money cents={plan.total_refund_cents} tone="refund" /></div>
            </div>
            <div className="review-buckets stack">
              {blocked && <div className="notice-banner tone-failed" role="alert" id="review-blockers" tabIndex={-1}><Icon name="error" /><div>
                <strong>Fix these details before approving</strong>
                <ul className="list-disc pl-4">{plan.blocking_problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
              </div></div>}
              {!plan.orders.length ? <EmptyState title="No orders to review" description="Seed and capture demo orders to see a refund plan." action={<ButtonLink to="/setup">Go to demo setup</ButtonLink>} /> : <>
                <OrderBucket bucket="confirmed" orders={confirmed} />
                <OrderBucket bucket="uncertain" orders={uncertain} />
                <OrderBucket bucket="unaffected" orders={unaffected} />
                {excluded.length > 0 && <OrderBucket bucket="excluded" orders={excluded} />}
              </>}
            </div>
          </div>
          <div className="sticky-actions">
            <div><span className="eyebrow">Total refund</span><Money cents={plan.total_refund_cents} tone="refund" className="heading-md" /></div>
            <Button id="approve-refunds" icon="payments" disabled={blocked || busy || plan.total_refund_cents <= 0} onClick={() => { setActionError(null); setDialog(true) }}>Approve refunds · {total}</Button>
          </div>
          {dialog && <ConfirmApproveDialog plan={plan} busy={busy} error={actionError} clearError={() => setActionError(null)}
            onClose={() => setDialog(false)} onConfirm={() => void approve()} />}
        </>
      })()}
    </section>
  )
}
