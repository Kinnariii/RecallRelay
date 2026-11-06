import type { PlannedOrder } from '../../api/schemas'
import { status } from '../../lib/status'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'
import { PlannedOrderCard } from './OrderCard'

type Bucket = PlannedOrder['bucket']
const headings: Record<Bucket, string> = {
  confirmed: 'Confirmed for refund', uncertain: 'Uncertain orders',
  unaffected: 'Unaffected orders', excluded: 'Excluded orders',
}
const descriptions: Record<Bucket, string> = {
  confirmed: 'Refund the affected items in these orders.',
  uncertain: 'Check these lot numbers before deciding.',
  unaffected: 'These orders will stay untouched.',
  excluded: 'These orders have no completed payment.',
}

export function OrderBucket({ bucket, orders }: { bucket: Bucket; orders: PlannedOrder[] }) {
  const { tone, icon, label } = status[bucket]
  const heading = <><span className={`icon-tile tone-${tone}`}><Icon name={icon} /></span>
    <span className="bucket-title"><span className="heading-sm">{headings[bucket]}</span><span className="muted text-sm">{descriptions[bucket]}</span></span>
    <Chip>{orders.length} {label.toLowerCase()}</Chip></>
  const content = <div className="stack bucket-content">
    {orders.length ? orders.map(order => <PlannedOrderCard key={order.order_id} order={order} />) : <p className="bucket-empty muted">No {label.toLowerCase()} orders.</p>}
  </div>

  return bucket === 'unaffected'
    ? <details open className="bucket bucket--unaffected"><summary className="bucket-header">{heading}<Icon name="expand_more" className="bucket-chevron" /></summary>{content}</details>
    : <section className={`bucket bucket--${bucket}`} aria-label={headings[bucket]}>
      <h2 className="bucket-header">{heading}</h2>{content}
    </section>
}
