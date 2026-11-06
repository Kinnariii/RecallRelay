# Frontend decisions

## 1. Scaffold

- Moved the supplied spec and nested Stitch export into the requested paths. Their contents remain intact as references.
- The twelve exports share one Tailwind token set. The frontend copies it from Upload Recall Notice and adds status styles separately.
- Home and system routes have no active workflow step. On workflow routes the tracker reflects route position.
- This handoff is a local Vite application. Hosting and backend implementation are separate from this frontend milestone.

## 2. API, UI, and mock logic

- Default to mock mode unless VITE_USE_MOCK is exactly false. Use the same Zod response shapes on both transports.
- Keep shared sample text outside the mock transport. Use fictional addresses under example.test and browser storage for demo data.
- For a discrete list, a parseable lot with a listed prefix is unaffected when absent from the list. Different formats stay uncertain.
- A balance guard blocks approval and prevents excess amounts from becoming refundable. Preserve the approved plan for later reads.
- The listed API has no recall detail or event history endpoint. Keep the last result link and audit observations in a mode-scoped browser cache. Refund statuses and timestamps always come from the API.
- Use native dialogs and distinguish status tones with text and icons. Darken small badge text where needed for AA while retaining the requested colors as accents.

## 3. Setup

- Real approval opens a validated HTTPS sandbox link in the current tab. The capture redirect and a return to browser focus refresh orders.
- The ledger displays amounts already supplied by the API and aggregates them for display. Capture is simulated only through the optional mock adapter method.

## 4. Notice and extraction

- Start with a blank editor. Reset Sample restores the selected sample, or the first sample when none has been selected.
- The extraction endpoint returns one response, so the checklist shows local preparation, waiting for extraction, and verification delivered with the response.
- Missing quotes get a dashed warning separate from the notice. Only quotes found in the notice are marked in place.
- Saving sends the edited fields, preserves the original extraction evidence, and fetches the plan again.

## 5. Review and confirmation

- Unaffected orders start expanded so all three demo outcomes are visible. Excluded orders appear only when present.
- Re-read the plan immediately before approval. If the payable receipt changed, require confirmation of the new amount. The server still owns the final transactional check because the agreed endpoint has no expected-total field.
- The review title uses recall scope from navigation when available. A direct review link can render from the plan alone.

## 6. Results

- Calculate the display total by summing completed API rows. Pending, failed, and cancelled rows remain visible without counting toward the completed total.
- Poll pending and initiated requests every three seconds until they settle. Only failed rows expose a new attempt.
- Show duplicate blocking only after the approval response reports that the row already existed. The timeline uses refund row timestamps and records the latest attempt from the API.

## 7. Home and system states

- The landing illustration uses labeled example states without invented customers, IDs, or amounts.
- Health checks retry every three seconds, skipping overlapping checks. Safe reads resume once healthy. The user explicitly repeats a write after reconnection.

## 8. Responsive and accessible behavior

- Keep the review summary sticky on desktop. At phone widths, leave it in the page flow to make room for order cards and the sticky approval bar.
- Display the result table as labeled row cards at narrow widths while keeping table semantics. Show the most recent toast above the workflow controls.
- Use native focus management with keyboard wrapping in dialogs. Escape closes dialogs when there is no write in progress.

## 9. Real transport

- The local HTTP stub uses pre-captured fixtures. The browser contract check starts the stub cold, forces one failed attempt, and settles its pending retry on status refresh.
- The real bundle selects the HTTP adapter at build time. The same five public sample notices are available in both modes.
- For an unavailable backend, auto-retry health and repeat safe reads when healthy. Keep extraction, reset, and approval writes explicit after recovery because a timed-out request may already have reached the server.

## 10. Handoff

- Node.js 24 runs Vite, the tests, and the TypeScript HTTP stub. The lint script uses the strict compiler checks to keep dependencies within the frontend toolchain.
- The local stub verifies the wire contract. Live sandbox capture and refund verification belongs to backend integration.
- The forbidden-copy scan covers runtime source and newly authored docs. The original spec and read-only Stitch export retain their original text.

# Backend decisions

## 1. Scaffold

- Node.js 24 runs the strict ESM backend. All example environment keys are required at startup, including an exact sandbox API URL.
- SQLite uses foreign keys and WAL. Extra internal fields store the authorized plan and the submission time for safe refund recovery. The frontend contract stays the same.
- Demo orders and notices come from the existing shared fixtures.

## 2. Matching and planning

- Standard lots use a letter prefix and hyphen followed by a safe integer. Exact matches in a discrete list take precedence. Lots absent from a list are unaffected when they share a known format, and unfamiliar formats stay uncertain.
- A capture ID and captured status are both required. Insufficient balance blocks approval of the plan instead of reducing the amount on an affected line.

## 3. Sandbox client

- Verified OAuth, checkout links, capture fields, partial refund amounts, and refund lookup against the PayPal references and official Postman examples. An authenticated Postman run needs the team’s sandbox app and buyer credentials.
- Checkout uses the wallet experience context and sends cancel to the same callback with a flag. The capture response must match the original order and USD amount.
- Refund POST requests include an explicit amount and stable request ID. Successful refund responses validate the ID, state, and amount when present.

## 4. Demo orders

- Local demo order IDs use their sequence numbers so the required refund request ID can fit PayPal’s documented 38-byte limit. Reset retains those local labels and obtains fresh upstream order IDs.
- Persist the seed batch key before calling the provider. Seed inserts the orders together, and a failed batch reuses its create keys. Reset runs exclusively with respect to in-process operations.
- A cancelled buyer return goes back to Setup without capturing. Simultaneous returns for one order share the same capture call.

## 5. AI and edits

- Use OpenAI Chat Completions Structured Outputs with a model selected through AI_MODEL. Provider calls are isolated from extraction, planning, and payment logic. Tests supply model responses for all five shared notices.
- Keep the internal AI_EXTRACTION_FAILED error and expose the contract’s EXTRACTION_FAILED response with HTTP 422. The existing frontend interprets 502 and 503 as cold starts before reading JSON, so the translation preserves its extraction-specific retry screen.
- Merchant edits update the working scope. Original extraction and evidence stay attached for comparison.

## 6. Approval and payment reservations

- An immediate SQLite transaction recomputes and snapshots the plan, then reserves every eligible refund before any provider call. Balance calculations reserve INITIATED, PENDING, and COMPLETED cents. The public refunded_cents field counts PENDING and COMPLETED.
- The unique recall/order pair and the per-row in-process lock prevent duplicate submits. The request ID remains identical across ambiguous retries. A recovered provider ID is checked with Get refund.
- Allow same-key replay for five minutes after an ambiguous submission. An unresolved older attempt stays reserved for reconciliation because the provider retains idempotency keys for a finite time. A late or ambiguous error cannot authorize a new attempt.
- Recall IDs use 11 URL-safe characters, and demo order IDs use one digit. The exact contract format fits the 38-byte request-header limit through attempt 999.

## 7. Refund status and retry

- Repeat approval returns existing pending rows without a provider call. The status endpoint checks known pending IDs and can recover a previously approved initiated attempt using its same key.
- A failed refund starts a new attempt only through the retry endpoint and after a fresh captured-balance check. Completed, pending, initiated, and cancelled rows retain their current attempt.

## 8. HTTP policy and deployment

- JSON bodies are limited to 128 KiB, and notices to 20,000 characters. Extract allows eight requests per minute per observed IP. Approval and refund retry share a 30-request budget. Behind a proxy that hides client IPs, the budget is shared.
- Reject mutations carrying a foreign browser Origin. Logs contain the method, route template, response status, and duration.
- Run one app process per SQLite file. Render deployments build from the repository root to retain shared fixtures. A free-tier restart can require a fresh seed.

## 9. Contract verification

- Ran the existing frontend in HTTP mode against the Express backend. The browser exercised seed, all three approval returns, extraction, edit, the $24.00 receipt, repeat approval, and reset. Sandbox and model transport fixtures supplied deterministic upstream responses.
- The live acceptance run requires sandbox app credentials, a sandbox buyer, and an AI key with model access. No credentials are included in the repository.
