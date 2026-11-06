import { useEffect, useState } from 'react'
import { api } from '../api'
import { isWaking } from '../api/client'
import type { Order } from '../api/schemas'
import { useOrders } from '../hooks/useOrders'
import { formatCents } from '../lib/money'
import { OrderCard } from '../components/domain/OrderCard'
import { ResetDemoButton } from '../components/domain/ResetDemoButton'
import { AsyncFailure } from '../components/ui/AsyncFailure'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/ToastProvider'

function sandboxUrl(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && (parsed.hostname === 'sandbox.paypal.com' || parsed.hostname.endsWith('.sandbox.paypal.com'))) return parsed.href
  } catch { /* only a validated sandbox URL can open */ }
  return null
}

export function Setup() {
  const { data, loading, error, reload, replace } = useOrders()
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const toast = useToast()
  const orders = data ?? []
  const captured = orders.filter(order => order.status === 'CAPTURED')
  const awaiting = orders.filter(order => order.status === 'AWAITING_APPROVAL')
  const total = orders.reduce((sum, order) => sum + order.total_cents, 0)
  const capturedTotal = captured.reduce((sum, order) => sum + order.total_cents, 0)

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
    if (capture && order.approval_url) {
      return <Button busy={busy === order.id} disabled={Boolean(busy)} icon="open_in_new"
        onClick={() => void run(order.id, () => capture(order.id), 'Sandbox order captured.')}>
        {busy === order.id ? 'Capturing order…' : 'Approve in PayPal sandbox'}
      </Button>
    }
    const url = sandboxUrl(order.approval_url)
    return url ? <a className="button button--primary" href={url}>Approve in PayPal sandbox <Icon name="open_in_new" /></a>
      : <span className="field-error">Sandbox approval link unavailable.</span>
  }

  const seed = () => void run('seed', api.seed, 'Demo orders are ready to approve.')

  return (
    <section className="container-shell page">
      <header className="page-header">
        <p className="eyebrow">Step 01 / Demo setup</p>
        <h1 className="heading-lg">Prepare demo orders</h1>
        <p className="muted">Seed and capture sandbox orders so the recall can match real order lines.</p>
      </header>
      <div className="split-layout setup-layout">
        <div className="stack">
          <div className="notice-banner tone-pending"><Icon name="info" /><div><strong>Demo environment only</strong><p>These fictional orders let you try the full recall workflow with sandbox payments.</p></div></div>
          <div className="row">
            <Button icon="database" busy={busy === 'seed'} disabled={Boolean(busy)} onClick={seed}>Seed demo orders</Button>
            <ResetDemoButton disabled={Boolean(busy)} onReset={next => { setActionError(null); replace(next) }} />
          </div>
          {actionError != null && <AsyncFailure error={actionError} onReady={isWaking(actionError) ? () => { setActionError(null); void reload() } : undefined} />}
          {error != null && <AsyncFailure error={error} retry={reload} />}
          {loading && !data && <Skeleton label="Loading demo orders…" rows={5} />}
          {!loading && !error && !data?.length && <EmptyState title="No demo orders yet" description="Seed the demo to create orders for the recall walkthrough." />}
          {orders.map(order => <OrderCard key={order.id} order={order} action={approval(order)} />)}
        </div>
        <aside className="stack setup-ledger">
          <Card className="stack">
            <div className="card-title"><span className="icon-tile"><Icon name="receipt_long" /></span><h2 className="heading-sm">Sandbox order ledger</h2></div>
            {data ? <>
              <div><p className="eyebrow">Total order value</p><p className="heading-lg amount mt-1">{formatCents(total)}</p></div>
              <dl className="ledger-list">
                <div><dt>Orders</dt><dd>{orders.length}</dd></div>
                <div><dt>Awaiting approval</dt><dd>{awaiting.length}</dd></div>
                <div><dt>Captured orders</dt><dd>{captured.length}</dd></div>
                <div><dt>Captured value</dt><dd className="amount">{formatCents(capturedTotal)}</dd></div>
              </dl>
            </> : loading ? <Skeleton rows={3} label="Loading order totals…" /> : <p className="muted text-sm">Order totals are unavailable.</p>}
          </Card>
          <Card className="stack">
            <h2 className="heading-sm">Ready for the recall?</h2>
            <p className="muted text-sm">Capture at least one order to continue. Capture all demo orders to see each review outcome.</p>
            {captured.length ? <ButtonLink to="/" icon="arrow_forward">Continue to upload notice</ButtonLink>
              : <Button disabled icon="arrow_forward">Continue to upload notice</Button>}
          </Card>
        </aside>
      </div>
    </section>
  )
}
