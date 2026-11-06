import type { RefundRow } from '../../api/schemas'
import type { RecallEvent, RecallEventKind } from '../../hooks/useRecall'
import { formatDateTime } from '../../lib/dates'
import { status } from '../../lib/status'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const eventTypes: Record<RecallEventKind, [string, string]> = {
  upload: ['Notice uploaded', 'upload_file'], extract: ['AI extracted fields', 'auto_awesome'],
  edit: ['Merchant edits saved', 'edit'], plan: ['Plan computed', 'fact_check'],
  approve: ['Refunds approved', 'verified'],
}

export function AuditDrawer({ events, refunds, onClose }: { events: RecallEvent[]; refunds: RefundRow[]; onClose: () => void }) {
  const timeline = [
    ...events.map(({ kind, detail, at }) => ({ at, detail, title: eventTypes[kind][0], icon: eventTypes[kind][1] })),
    ...refunds.map(row => ({
      at: row.updated_at, title: `Refund ${status[row.status].label.toLowerCase()}`, icon: status[row.status].icon,
      detail: [row.order_id, row.paypal_refund_id, row.paypal_request_id].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  return (
    <Modal title="Recall activity" onClose={onClose} drawer>
      <p className="muted text-sm">This timeline combines activity observed in this browser with refund records from the sandbox.</p>
      {!timeline.length ? <p className="muted mt-5">No activity recorded yet.</p> : <ol className="audit-timeline">
        {timeline.map(({ at, title, detail, icon }, index) => <li key={`${at}-${index}`}>
          <span className="icon-tile"><Icon name={icon} /></span>
          <div><h3 className="heading-sm">{title}</h3><p className="muted text-sm break-words">{detail}</p><time className="eyebrow" dateTime={at}>{formatDateTime(at)}</time></div>
        </li>)}
      </ol>}
    </Modal>
  )
}
