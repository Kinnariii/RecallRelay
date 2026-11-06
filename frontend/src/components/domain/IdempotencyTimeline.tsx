import type { RefundRow } from '../../api/schemas'
import { formatDateTime } from '../../lib/dates'
import { status } from '../../lib/status'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

export function IdempotencyTimeline({ rows, repeatIds }: { rows: RefundRow[]; repeatIds: ReadonlySet<string> }) {
  return (
    <Card className="stack">
      <div className="card-title"><span className="icon-tile"><Icon name="timeline" /></span><div>
        <h2 className="heading-sm">Refund timeline</h2><p className="muted text-sm">See when the refund was requested and what happened next.</p>
      </div></div>
      {rows.map(row => <section key={row.id} className="request-history">
        <h3 className="heading-sm">{row.order_id} · Attempt {row.attempt}</h3>
        <p className="muted text-sm mt-1">Request ID: <code className="id-value">{row.paypal_request_id}</code></p>
        <ol className="request-steps">
          <li><Icon name="add_circle" /><strong>Request created</strong><time dateTime={row.created_at}>{formatDateTime(row.created_at)}</time></li>
          <li><Icon name={row.paypal_refund_id ? 'send' : 'schedule'} /><strong>{row.paypal_refund_id ? 'Sent to PayPal' : 'Sandbox response'}</strong>
            <span>{row.paypal_refund_id ? 'Sandbox refund ID recorded' : 'No refund ID recorded'}</span></li>
          <li><Icon name={status[row.status].icon} /><strong>Refund {status[row.status].label.toLowerCase()}</strong><time dateTime={row.updated_at}>{formatDateTime(row.updated_at)}</time></li>
          <li className={repeatIds.has(row.id) || row.already_existed ? 'request-repeat' : ''}>
            <Icon name="shield" /><strong>{repeatIds.has(row.id) || row.already_existed ? 'Duplicate blocked' : 'Repeat approval'}</strong>
            <span>{repeatIds.has(row.id) || row.already_existed ? 'Existing request returned' : 'Uses the existing request'}</span>
          </li>
        </ol>
      </section>)}
    </Card>
  )
}
