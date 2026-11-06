import type { PlannedOrder } from '../../api/schemas'
import { status } from '../../lib/status'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'
import { PlannedOrderCard } from './OrderCard'

type Bucket = PlannedOrder['bucket']
const headings: Record<Bucket, string> = {
  confirmed: 'Confirmed for partial refund', uncertain: 'Uncertain / Needs manual review',
  unaffected: 'Unaffected orders', excluded: 'Excluded orders',
}
const descriptions: Record<Bucket, string> = {
  confirmed: 'These captured orders contain at least one affected line.',
  uncertain: 'These orders need a lot check before any refund can be considered.',
  unaffected: 'These orders will stay untouched.',
  excluded: 'These orders have no eligible captured payment.',
}

export function OrderBucket({ bucket, orders }: { bucket: Bucket; orders: PlannedOrder[] }) {
  const { tone, icon, label } = status[bucket]
  const heading = <><span className={`icon-tile tone-${tone}`}><Icon name={icon} /></span>
    <span className="bucket-title"><span className="heading-sm">{headings[bucket]}</span><span className="muted text-sm">{descriptions[bucket]}</span></span>
    <Badge tone={tone}>{orders.length} {label.toLowerCase()}</Badge></>
  const content = <div className="stack bucket-content">
    {orders.length ? orders.map(order => <PlannedOrderCard key={order.order_id} order={order} />) : <p className="bucket-empty muted">No {label.toLowerCase()} orders.</p>}
  </div>

  return bucket === 'unaffected'
    ? <details open className="bucket bucket--unaffected"><summary className="bucket-header">{heading}<Icon name="expand_more" className="bucket-chevron" /></summary>{content}</details>
    : <section className={`bucket bucket--${bucket}`} aria-label={headings[bucket]}>
      <h2 className="bucket-header">{heading}</h2>{content}
    </section>
}
