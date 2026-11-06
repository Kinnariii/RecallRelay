import { useEffect, useState } from 'react'
import { api } from '../api'
import { isWaking } from '../api/client'
import type { Order } from '../api/schemas'
import { useOrders } from '../hooks/useOrders'
import { OrderCard } from '../components/domain/OrderCard'
import { DemoCoach } from '../components/layout/DemoCoach'
import { ResetDemoButton } from '../components/domain/ResetDemoButton'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Money } from '../components/ui/Money'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { Stat } from '../components/ui/Stat'
import { useToast } from '../components/ui/ToastProvider'

function sandboxUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port &&
      (parsed.hostname === 'sandbox.paypal.com' || parsed.hostname.endsWith('.sandbox.paypal.com'))) return parsed.href
  } catch { /* Only a validated sandbox URL can open. */ }
  return null
}

const guideSteps = ['Seed orders', 'Approve each sandbox order', 'Continue to the notice']

export function Setup() {
  const { data, loading, error, reload, replace } = useOrders()
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const toast = useToast()
  const orders = data ?? []
  const captured = orders.filter(order => order.status === 'CAPTURED')
  const awaiting = orders.filter(order => order.status === 'AWAITING_APPROVAL')
  const firstReady = orders[0]?.status === 'CAPTURED'
  const allReady = Boolean(orders.length && captured.length === orders.length)
  const nextStep = !orders.length ? 0 : allReady ? 2 : 1
  const total = orders.reduce((sum, order) => sum + order.total_cents, 0)
  const capturedTotal = captured.reduce((sum, order) => sum + order.total_cents, 0)
  const nextApproval = awaiting[0]?.id

  useEffect(() => {
    if (api.mockCapture) return
    const refresh = () => void reload()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [reload])

  async function run(id: string, action: () => Promise<{ orders: Order[] }>, message: string) {
    setBusy(id)
    setActionError(null)
    try {
      replace((await action()).orders)
      toast(message, 'success')
    } catch (reason) {
      setActionError(reason)
    } finally {
      setBusy(null)
    }
  }

  function approval(order: Order) {
    if (order.status !== 'AWAITING_APPROVAL') return null
    const capture = api.mockCapture
    const primary = order.id === nextApproval
    const variant = primary ? 'primary' : 'secondary'
    const id = primary ? 'next-order-approval' : undefined
    if (capture && order.approval_url) {
      return <Button id={id} variant={variant} busy={busy === order.id} disabled={Boolean(busy)} icon="check_circle"
        onClick={() => void run(order.id, () => capture(order.id), `Payment approved for ${order.customer_name}.`)}>
        {busy === order.id ? 'Approving payment…' : 'Approve in PayPal sandbox'}
      </Button>
    }
    const url = sandboxUrl(order.approval_url)
    return url ? <a id={id} className={`button button--${variant}`} href={url} target="_blank" rel="noopener noreferrer" aria-describedby="sandbox-approval-note">
      <Icon name="open_in_new" /> Approve in PayPal sandbox
    </a> : <span className="field-error">The approval link is unavailable. Refresh this page to try again.</span>
  }

  return (
    <section className="container-shell page setup-page">
      <SectionHeader eyebrow="Step 1 · Demo setup" title="Prepare demo orders"
        description="Use fictional orders and sandbox payments to try the recall from start to finish." />
      {!error && <DemoCoach hint={!orders.length ? 'Seed the three demo orders to start.' : allReady ? 'All three payments are ready for the recall.' : 'Approve each sandbox payment so you can see all three order outcomes.'}
        action={!orders.length ? 'Find seed button' : nextApproval ? 'Find next order' : 'Find Continue'}
        targets={busy ? [] : [!orders.length ? 'seed-orders' : nextApproval ? 'next-order-approval' : 'continue-setup']} />}
      <Card className="setup-guide stack" aria-label="Prepare the demo">
        <ol className="mini-steps">
          {guideSteps.map((step, index) => <li key={step} aria-current={index === nextStep ? 'step' : undefined}>
            <span className="mini-step-number">{index < nextStep ? <Icon name="check_circle" /> : index + 1}</span>
            <span>{step}{index < nextStep && <span className="sr-only"> completed</span>}</span>
          </li>)}
        </ol>
        <div className="row between setup-guide-actions">
          {!orders.length ? <Button id="seed-orders" icon="add_circle" busy={busy === 'seed'} disabled={loading && !error}
            onClick={() => void run('seed', api.seed, 'Demo orders are ready to approve.')}>Seed demo orders</Button>
            : <p className="muted text-sm" id="sandbox-approval-note">
              {allReady ? 'All demo payments are approved.' : api.mockCapture ? 'Approve all three payments to see every outcome.' : 'Approval opens the sandbox in a new tab. Approve there, then return here.'}
            </p>}
          <div className="row">
            {orders.length > 0 && <ResetDemoButton disabled={Boolean(busy)} onReset={next => { setActionError(null); replace(next) }} />}
            {firstReady ? <ButtonLink id="continue-setup" to="/" variant={allReady || !nextApproval ? 'primary' : 'secondary'} icon="arrow_forward">Continue to upload notice</ButtonLink>
              : <span className="disabled-reason">
                <Button variant="secondary" aria-disabled="true" aria-describedby="setup-continue-help" icon="arrow_forward">Continue to upload notice</Button>
                <span role="tooltip" id="setup-continue-help">Approve the first order before continuing.</span>
              </span>}
          </div>
        </div>
      </Card>
      <div className="split-layout setup-layout">
        <div className="stack">
          {actionError != null && <AsyncFailure error={actionError} onReady={isWaking(actionError) ? () => { setActionError(null); void reload() } : undefined} />}
          {error != null && <AsyncFailure error={error} retry={reload} />}
          {loading && !data && <Skeleton label="Loading demo orders…" variant="orders" />}
          {!loading && !error && !data?.length && <EmptyState title="No demo orders yet" description="Seed the demo to create three orders for the walkthrough." />}
          {orders.map(order => <OrderCard key={order.id} order={order} action={approval(order)} />)}
        </div>
        {Boolean(data?.length) && <aside className="setup-ledger">
          <Card className="stack">
            <div className="card-title"><span className="icon-tile"><Icon name="receipt_long" /></span><h2 className="heading-sm">Demo order totals</h2></div>
            <dl className="ledger-list">
              <Stat label="Total order value"><Money cents={total} /></Stat>
              <Stat label="Awaiting approval"><span>{awaiting.length}</span></Stat>
              <Stat label="Payments approved"><span>{captured.length} of {orders.length}</span></Stat>
              <Stat label="Approved value"><Money cents={capturedTotal} /></Stat>
            </dl>
          </Card>
        </aside>}
      </div>
    </section>
  )
}
