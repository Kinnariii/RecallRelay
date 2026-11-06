# RecallRelay frontend API contract

Base URL comes from `VITE_API_URL`. Requests and responses are JSON, with USD amounts in integer cents. Enable CORS for the frontend origin, including `Content-Type`, `GET`, `POST`, and `PATCH`.

| Method and path | Body | Success response |
| --- | --- | --- |
| GET /api/health | — | `{ ok: true }` |
| POST /api/admin/seed | — | `{ orders: Order[] }` |
| POST /api/admin/reset | — | `{ orders: Order[] }` |
| GET /api/orders | — | `{ orders: Order[] }` |
| POST /api/recalls/extract | `{ noticeText }` | `{ recall: Recall }` |
| PATCH /api/recalls/:id | `{ sku, lot_prefix, lot_start, lot_end }` | `{ recall: Recall }` |
| GET /api/recalls/:id/plan | — | `{ plan: Plan }` |
| POST /api/recalls/:id/approve | — | `{ results: RefundRow[], plan: Plan }` |
| GET /api/recalls/:id/refunds | — | `{ refunds: RefundRow[] }` |
| POST /api/recalls/:id/refunds/:orderId/retry | — | `{ refund: RefundRow }` |

```ts
type Order = {
  id: string; customer_name: string; customer_email: string
  paypal_order_id: string; paypal_capture_id: string | null
  status: 'CREATED' | 'AWAITING_APPROVAL' | 'CAPTURED' | 'FAILED'
  total_cents: number; currency: 'USD'; approval_url: string | null
  refunded_cents: number
  lines: { id: string; sku: string; name: string; qty: number
    unit_price_cents: number; lot_number: string | null }[]
}

type Extraction = {
  sku: string | null; product_name: string | null; lot_prefix: string | null
  lot_start: number | null; lot_end: number | null; extra_lots: string[]
  evidence: { field: string; quote: string; verified: boolean }[]
  ambiguities: string[]; confidence: 'high' | 'medium' | 'low'
}

type Recall = {
  id: string; notice_text: string; status: 'DRAFT' | 'APPROVED' | 'COMPLETED'
  sku: string | null; lot_prefix: string | null
  lot_start: number | null; lot_end: number | null
  extraction: Extraction
  catalog_match: { sku: string; name: string; unit_price_cents: number } | null
}

type Plan = {
  recall_id: string; blocking_problems: string[]; total_refund_cents: number
  orders: { order_id: string; customer_name: string; customer_email: string
    total_cents: number; bucket: 'confirmed' | 'uncertain' | 'unaffected' | 'excluded'
    reason: string; refund_cents: number
    lines: { sku: string; name: string; qty: number; unit_price_cents: number
      lot_number: string | null; line_total_cents: number
      classification: 'affected' | 'unaffected' | 'uncertain' | 'not_applicable' }[]
  }[]
}

type RefundRow = {
  id: string; recall_id: string; order_id: string; amount_cents: number
  attempt: number; paypal_request_id: string; paypal_refund_id: string | null
  status: 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  error: string | null; created_at: string; updated_at: string; already_existed: boolean
}
```

- Seed is idempotent. Reset clears the demo and seeds fresh awaiting orders. Real order approval uses the returned `approval_url`. The backend captures the approved order and redirects the browser to `/setup`.
- Patch accepts a nonempty SKU and nullable prefix and bounds for a discrete lot list. A range needs a prefix and both bounds. The frontend fetches the plan again after a save.
- Approval recomputes the plan before first execution. Store the authorized plan for subsequent reads so classification and original refund amounts survive balance changes. Use one row per recall and order. Repeat approval returns existing rows with `already_existed: true`. Fetching refunds refreshes pending statuses. Explicit retry is for failed rows and increments `attempt`.
- Request ID format is `recall-{recallId}-order-{orderId}-attempt-{n}`. Return ISO 8601 timestamps. Human-readable plan reasons and blocking problems are safe display copy.
- Errors use `{ error: { code: string, message: string } }`. Clients map error codes to safe copy. Useful codes are `NOT_FOUND`, `PLAN_BLOCKED`, `EXTRACTION_FAILED`, `INVALID_INPUT`, `RECALL_LOCKED`, `REFUND_NOT_RETRYABLE`, and `REFUND_FAILED`. A missing recall or order returns 404. A known recall with zero refunds returns an empty list.
