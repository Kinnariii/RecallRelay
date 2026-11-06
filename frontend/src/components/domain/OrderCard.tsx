import type { ReactNode } from 'react'
import type { Order, PlannedOrder } from '../../api/schemas'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { CopyButton } from '../ui/CopyButton'
import { Icon } from '../ui/Icon'
import { Money } from '../ui/Money'
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
        <div className="order-total"><span className="eyebrow">Order total</span><Money cents={order.total_cents} /></div>
      </div>
      <ul className="order-lines" aria-label="Order line items">
        {order.lines.map(line => <li key={line.id}>
          <div><strong>{line.name}</strong><span className="line-meta">{line.sku} · Qty {line.qty}</span></div>
          {line.lot_number ? <Chip>{line.lot_number}</Chip> : <Chip>No lot recorded</Chip>}
          <span className="line-price"><Money cents={line.unit_price_cents} /> each</span>
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
        <div className="order-total"><span className="eyebrow">Order total</span><Money cents={order.total_cents} /></div>
      </div>
      <p className="plan-reason">{order.reason}</p>
      <ul className="order-lines" aria-label="Planned order line items">
        {order.lines.map((line, index) => <li key={`${line.sku}-${index}`} className={`line--${line.classification}`}>
          <div><strong>{line.name}</strong><span className="line-meta">{line.sku} · Qty {line.qty}</span></div>
          {line.lot_number ? <Chip>{line.lot_number}</Chip> : line.classification === 'uncertain' && <Badge tone="uncertain" icon="warning">No lot recorded</Badge>}
          {line.classification === 'affected' && <Badge tone="confirmed" icon="check_circle">Affected item</Badge>}
          {confirmed && (line.classification === 'not_applicable' || line.classification === 'unaffected') &&
            <Badge tone="unaffected" icon="remove_circle_outline">Kept</Badge>}
          <Money className="line-price" cents={line.line_total_cents} tone={line.classification === 'affected' ? 'refund' : 'retained'} />
        </li>)}
      </ul>
      {confirmed ? <div className="refund-allocation">
        <div className="row between text-sm"><span>Refund amount</span><Money cents={order.refund_cents} of={order.total_cents} tone="refund" /></div>
        <ProgressBar label="Refund share of basket" value={order.total_cents ? order.refund_cents / order.total_cents * 100 : 0} />
      </div> : order.bucket === 'uncertain' ? <div className="row between order-card-foot">
        <Badge tone="uncertain" icon="warning">Needs manual review</Badge>
        <p className="muted text-sm">Not refunded automatically.</p>
      </div> : null}
    </Card>
  )
}
