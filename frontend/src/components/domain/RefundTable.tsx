import type { Plan, RefundRow } from '../../api/schemas'
import { formatDateTime } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import { Card } from '../ui/Card'
import { CopyButton } from '../ui/CopyButton'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

export function RefundTable({ rows, orders }: { rows: RefundRow[]; orders: Plan['orders'] }) {
  return (
    <Card className="refund-table-card">
      <div className="card-title"><span className="icon-tile"><Icon name="receipt_long" /></span>
        <div><h2 className="heading-sm">Refund ledger</h2><p className="muted text-sm">Sandbox transactions for this recall.</p></div>
      </div>
      <table className="refund-table" aria-label="Refund ledger" role="table">
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader">Order</th>
          <th scope="col" role="columnheader">Refund amount</th>
          <th scope="col" role="columnheader">PayPal refund ID</th>
          <th scope="col" role="columnheader">Status</th>
          <th scope="col" role="columnheader">Last updated</th>
          <th scope="col" role="columnheader">Request ID</th>
        </tr></thead>
        <tbody role="rowgroup">{rows.map(row => {
          const order = orders.find(item => item.order_id === row.order_id)
          return <tr key={row.id} role="row">
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">Order</span><strong>{order?.customer_name ?? row.order_id}</strong>{order && <small>{row.order_id}</small>}</td>
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">Refund amount</span><strong className="amount">{formatCents(row.amount_cents)}</strong></td>
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">PayPal refund ID</span>{row.paypal_refund_id
              ? <span className="row refund-id"><code className="id-value">{row.paypal_refund_id}</code><CopyButton label="refund ID" value={row.paypal_refund_id} /></span>
              : <span className="muted">Not available yet</span>}</td>
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">Status</span><StatusBadge value={row.status} /></td>
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">Last updated</span><time dateTime={row.updated_at}>{formatDateTime(row.updated_at)}</time></td>
            <td role="cell"><span className="mobile-cell-label" aria-hidden="true">Request ID</span><code className="id-value">{row.paypal_request_id}</code></td>
          </tr>
        })}</tbody>
      </table>
    </Card>
  )
}
