import type { ReactNode } from 'react'
import type { Order, PlannedOrder } from '../../api/schemas'
import { formatCents } from '../../lib/money'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CopyButton } from '../ui/CopyButton'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'
import { StatusBadge } from '../ui/StatusBadge'

export function OrderCard({ order, action }: { order: Order; action?: ReactNode }) {
  return (
    <Card className="order-card">
      <div className="order-heading">
        <span className="icon-tile"><Icon name="person" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="heading-sm">{order.customer_name}</h3>
          <p className="muted break-words text-sm">{order.customer_email} · {order.id}</p>
        </div>
        <StatusBadge value={order.status} />
        <div className="order-total"><span className="eyebrow">Basket total</span><strong className="amount">{formatCents(order.total_cents)}</strong></div>
      </div>
      <ul className="order-lines" aria-label="Order line items">
        {order.lines.map(line => <li key={line.id}>
          <div><strong>{line.name}</strong><span className="line-meta">{line.sku} · Qty {line.qty}</span></div>
          {line.lot_number ? <Badge>{line.lot_number}</Badge> : <Badge tone="uncertain" icon="warning">No lot recorded</Badge>}
          <span className="amount line-price">{formatCents(line.unit_price_cents)} each</span>
        </li>)}
      </ul>
      <div className="row between order-card-foot">
        <div className="row">
          <span className="eyebrow">Capture ID</span>
          {order.paypal_capture_id ? <><code className="id-value">{order.paypal_capture_id}</code><CopyButton value={order.paypal_capture_id} label="capture ID" /></>
            : <span className="muted text-sm">Awaiting capture</span>}
        </div>
        {action}
      </div>
    </Card>
  )
}

export function PlannedOrderCard({ order }: { order: PlannedOrder }) {
  const confirmed = order.bucket === 'confirmed'
  return (
    <Card className={`order-card planned-card planned-card--${order.bucket}`}>
      <div className="order-heading">
        <span className="icon-tile"><Icon name="person" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="heading-sm">{order.customer_name}</h3>
          <p className="muted break-words text-sm">{order.customer_email} · {order.order_id}</p>
        </div>
        <StatusBadge value={order.bucket} />
        <div className="order-total"><span className="eyebrow">Basket total</span><strong className="amount">{formatCents(order.total_cents)}</strong></div>
      </div>
      <p className="plan-reason">{order.reason}</p>
      <ul className="order-lines" aria-label="Planned order line items">
        {order.lines.map((line, index) => <li key={`${line.sku}-${index}`} className={`line--${line.classification}`}>
          <div><strong>{line.name}</strong><span className="line-meta">{line.sku} · Qty {line.qty}</span></div>
          {line.lot_number ? <Badge>{line.lot_number}</Badge> : line.classification === 'uncertain' && <Badge tone="uncertain" icon="warning">No lot recorded</Badge>}
          {line.classification === 'affected' && <Badge tone="confirmed" icon="check_circle">Affected</Badge>}
          <strong className="amount line-price">{formatCents(line.line_total_cents)}</strong>
        </li>)}
      </ul>
      {confirmed ? <div className="refund-allocation">
        <div className="row between text-sm"><span>Refund amount</span><strong className="amount">{formatCents(order.refund_cents)} of {formatCents(order.total_cents)}</strong></div>
        <ProgressBar label="Refund share of basket" value={order.total_cents ? order.refund_cents / order.total_cents * 100 : 0} />
      </div> : order.bucket === 'uncertain' ? <div className="row between order-card-foot">
        <Badge tone="uncertain" icon="warning">Needs manual review</Badge>
        <Button variant="secondary" disabled>Review manually</Button>
      </div> : null}
    </Card>
  )
}
