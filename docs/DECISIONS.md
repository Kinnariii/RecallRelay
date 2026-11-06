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
