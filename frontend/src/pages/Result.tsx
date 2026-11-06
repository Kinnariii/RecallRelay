import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { ApiError } from '../api/client'
import type { Plan, RefundRow } from '../api/schemas'
import { AuditDrawer } from '../components/domain/AuditDrawer'
import { IdempotencyTimeline } from '../components/domain/IdempotencyTimeline'
import { RefundTable } from '../components/domain/RefundTable'
import { ResetDemoButton } from '../components/domain/ResetDemoButton'
import { SafeRetryCard } from '../components/domain/SafeRetryCard'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/ToastProvider'
import { usePlan } from '../hooks/usePlan'
import { usePolling } from '../hooks/usePolling'
import { useRecall } from '../hooks/useRecall'
import { useRefunds } from '../hooks/useRefunds'
import { formatCents } from '../lib/money'

export function Result() {
  const { recallId } = useParams()
  return recallId ? <RecallResult key={recallId} id={recallId} /> : null
}

function Outcomes({ orders }: { orders: Plan['orders'] }) {
  const untouched = orders.filter(order => order.bucket === 'unaffected')
  const flagged = orders.filter(order => order.bucket === 'uncertain')
  return (
    <div className="outcomes">
      <Card className="stack">
        <div className="card-title"><span className="icon-tile tone-unaffected"><Icon name="remove_circle_outline" /></span><h2 className="heading-sm">Untouched orders</h2></div>
        {untouched.length ? <ul className="outcome-list">{untouched.map(order => <li key={order.order_id}>
          <div><strong>{order.customer_name}</strong><p className="muted text-sm">{order.reason}</p></div><StatusBadge value="unaffected" />
        </li>)}</ul> : <p className="muted text-sm">No unaffected orders in this plan.</p>}
      </Card>
      <Card className="stack">
        <div className="card-title"><span className="icon-tile tone-uncertain"><Icon name="warning" /></span><h2 className="heading-sm">Flagged orders</h2></div>
        {flagged.length ? <ul className="outcome-list">{flagged.map(order => <li key={order.order_id}>
          <div><strong>{order.customer_name}</strong><p className="muted text-sm">{order.reason}</p></div><Badge tone="uncertain" icon="warning">Needs manual review</Badge>
        </li>)}</ul> : <p className="muted text-sm">No orders need manual review.</p>}
      </Card>
    </div>
  )
}

function RecallResult({ id }: { id: string }) {
  const plan = usePlan(id)
  const refunds = useRefunds(id)
  const [drawer, setDrawer] = useState(false)
  const [operation, setOperation] = useState<string | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [repeatIds, setRepeatIds] = useState<ReadonlySet<string>>(() => new Set())
  const operationLock = useRef(false)
  const { events, latestResult, setLatest } = useRecall()
  const toast = useToast()
  const navigate = useNavigate()
  const rows = refunds.data
  const pending = Boolean(rows?.some(row => row.status === 'PENDING' || row.status === 'INITIATED'))
  usePolling(pending && !operation && !refunds.loading && !refunds.error, refunds.reload)

  useEffect(() => {
    if (rows?.length && !latestResult) setLatest(id)
  }, [id, latestResult, rows, setLatest])

  async function approveAgain() {
    if (operationLock.current) return []
    operationLock.current = true
    setOperation('approve')
    try {
      const result = await api.approve(id)
      refunds.replace(result.results)
      plan.replace(result.plan)
      setRepeatIds(current => new Set([...current, ...result.results.filter(row => row.already_existed).map(row => row.id)]))
      return result.results
    } finally {
      operationLock.current = false
      setOperation(null)
    }
  }

  async function retry(row: RefundRow) {
    if (operationLock.current) return
    operationLock.current = true
    setOperation(row.id)
    setActionError(null)
    try {
      const { refund } = await api.retry(id, row.order_id)
      refunds.replace((rows ?? []).map(item => item.id === row.id ? refund : item))
      setRepeatIds(current => new Set([...current].filter(id => id !== row.id)))
      toast(`Refund attempt ${refund.attempt} · ${refund.status.toLowerCase()}.`, refund.status === 'COMPLETED' ? 'success' : 'info')
    } catch (reason) {
      setActionError(reason)
      void refunds.reload()
    } finally {
      operationLock.current = false
      setOperation(null)
    }
  }

  function refresh() {
    setActionError(null)
    void refunds.reload()
    if (plan.error) void plan.reload()
  }

  const completed = rows?.filter(row => row.status === 'COMPLETED') ?? []
  const failed = rows?.filter(row => row.status === 'FAILED') ?? []
  const cancelled = rows?.filter(row => row.status === 'CANCELLED') ?? []
  const total = completed.reduce((sum, row) => sum + row.amount_cents, 0)
  const error = refunds.error ?? plan.error
  const initial = !rows || !plan.data
  const reviewPath = `/review/${encodeURIComponent(id)}`

  return (
    <section className="container-shell page result-page">
      <header className="result-hero">
        <span className="hero-result-icon"><Icon name={pending ? 'schedule' : completed.length ? 'check_circle' : failed.length ? 'error' : 'receipt_long'} /></span>
        <div>
          <p className="eyebrow">Step 04 / Refund result</p>
          <h1>{completed.length ? `${formatCents(total)} refunded` : pending ? 'Refunds are processing' : failed.length ? 'Refund needs attention' : 'Refund result'}</h1>
          <p>{completed.length ? 'The sandbox completed refunds for the affected order lines shown below.' : 'See the latest status of your sandbox refund requests.'}</p>
        </div>
        {rows && rows.length > 0 && <div className="result-hero-total"><span className="eyebrow">Completed refunds</span><strong className="amount">{formatCents(total)}</strong><span>{completed.length} of {rows.length} completed</span></div>}
      </header>
      {error != null && <AsyncFailure error={error} retry={refresh} />}
      {initial && !error && <Skeleton rows={6} label="Loading refund results…" />}
      {!initial && rows.length === 0 && !error && <EmptyState title="No refunds issued yet" description="Review this recall and approve the eligible refunds." action={<ButtonLink to={reviewPath}>Back to review</ButtonLink>} />}
      {!initial && rows.length > 0 && <>
        {pending && <div className="notice-banner tone-pending" role="status"><Icon name="schedule" /><div><strong>Refund processing</strong><p>We’ll refresh status every three seconds while a request is processing.</p></div></div>}
        {failed.map(row => <Card key={row.id} className="failed-refund">
          <div className="row between">
            <div className="card-title"><span className="icon-tile tone-failed"><Icon name="error" /></span>
              <div><h2 className="heading-sm">Refund failed · {row.order_id}</h2><p className="muted text-sm">{new ApiError('REFUND_FAILED').message}</p></div>
            </div>
            <Button variant="danger" icon="restart_alt" busy={operation === row.id} disabled={Boolean(operation) || refunds.loading} onClick={() => void retry(row)}>Retry refund (new attempt)</Button>
          </div>
        </Card>)}
        {cancelled.length > 0 && <div className="notice-banner tone-unaffected"><Icon name="cancel" /><div><strong>Refund cancelled</strong><p>The sandbox cancelled {cancelled.length === 1 ? 'a refund request' : `${cancelled.length} refund requests`}.</p></div></div>}
        {actionError != null && <AsyncFailure error={actionError} onReady={refresh} />}
        <RefundTable rows={rows} orders={plan.data!.orders} />
        <Outcomes orders={plan.data!.orders} />
        <SafeRetryCard approve={approveAgain} disabled={Boolean(operation) || refunds.loading} />
        <IdempotencyTimeline rows={rows} repeatIds={repeatIds} />
      </>}
      <div className="row result-actions">
        <Button variant="secondary" icon="refresh" busy={refunds.loading && Boolean(rows)} disabled={Boolean(operation) || initial} onClick={refresh}>Refresh status</Button>
        <ButtonLink to="/" icon="add">Start another recall</ButtonLink>
        <ResetDemoButton disabled={Boolean(operation)} onReset={() => navigate('/setup', { replace: true })} />
        {rows && rows.length > 0 && <Button className="audit-button" variant="ghost" icon="timeline" onClick={() => setDrawer(true)}>View recall activity</Button>}
      </div>
      {drawer && <AuditDrawer events={Object.hasOwn(events, id) ? events[id] : []} refunds={rows ?? []} onClose={() => setDrawer(false)} />}
    </section>
  )
}
