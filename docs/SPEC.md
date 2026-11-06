# RecallRelay: Build Specification

*Context document for the AI coding agent (Antigravity). Read all of it before writing any code. Team: 2 people. PayPal AI Hackathon 2026. Official deadline: 12 Nov 2026, 12:00 PM Pacific (13 Nov, 1:30 AM IST). Internal target: submit by 12 Nov, 3 PM IST.*

## 1. Instructions to the AI coding agent

- Build exactly what this document specifies. If something is ambiguous, choose the simplest option that still passes the acceptance test in section 3, and record the assumption in `docs/DECISIONS.md`.
- Work in small steps, in the order of section 14. After every step the app must still start and run.
- Money logic is deterministic. Refund amounts are computed only on the server from stored order lines. Never take an amount from the AI model or from the browser.
- Never hardcode or log secrets. Read credentials from environment variables. Keep `.env` in `.gitignore` and commit `.env.example`.
- Write unit tests for all pure logic (section 10) before wiring it into routes.
- Use the PayPal sandbox only. Never use live credentials or real money.
- All demo data is fictional. No real brand names or logos anywhere, because the demo video must not show third-party trademarks.
- Keep dependencies minimal. Use plain `fetch` for PayPal calls instead of unofficial SDKs.
- Use TypeScript in both folders. Validate all external input (HTTP bodies, AI output, PayPal responses) with `zod`.

## 2. Hackathon requirements the project must satisfy

- Meaningfully use PayPal (sandbox Orders and Payments APIs) and AI (document extraction).
- A working prototype. Judges must be able to run it from README instructions or a hosted URL. Mockups do not count.
- Public GitHub repo containing all source, assets and instructions, with an open-source license (MIT) visible in the repo About section.
- A text description, and a list of the AI tools used and how they were used.
- A public YouTube demo video under 3 minutes showing the app running, with no third-party trademarks or copyrighted music.
- Judging criteria reported by a third-party listing (verify on Devpost): technical implementation, design, potential impact, innovation, presentation.

## 3. Product and acceptance test

**What it is:** RecallRelay helps a small online retailer handle a supplier recall. The merchant uploads a recall notice. AI extracts the affected product (SKU) and lot range, quoting the supporting text. The app sorts orders into confirmed, unaffected and uncertain, calculates refunds only for affected order lines, and after merchant approval issues partial refunds through the PayPal sandbox.

**Target user:** a small retailer who gets a supplier recall notice and must refund the right customers the right amount.

**Demo acceptance test (the app is done when this passes end to end):**

1. Three orders contain the same SKU. Order 1 has lot B-214, order 2 has lot B-310, order 3 has no lot number.
2. The merchant pastes or uploads the supplier notice (affected lots B-200 to B-250).
3. AI extracts SKU `PB-340` and the lot range, and the UI highlights the supporting text from the notice.
4. The plan shows order 1 as confirmed (refund $24.00 out of a $68.00 basket), order 2 as unaffected (no action), and order 3 as uncertain (flagged for manual review).
5. The merchant clicks Approve. A real PayPal sandbox partial refund of $24.00 is issued against order 1's original capture.
6. The result screen shows the PayPal refund ID and status.
7. Clicking Approve again (or retrying after a failure) never creates a second refund for the same order.
8. Order 2 is untouched and order 3 stays flagged.

## 4. Tech stack

- **Frontend:** React + Vite + TypeScript, React Router, plain CSS or Tailwind. No heavy UI libraries.
- **Backend:** Node.js + Express + TypeScript, `better-sqlite3` for SQLite, `zod` for validation, `vitest` for tests.
- **AI:** one language model with structured JSON output, called through a single function `callModel(system, user)` in `backend/src/ai/model.ts` so the provider can be swapped. Model name and key come from environment variables. Use a current model string available to the team.
- **PayPal:** REST API, sandbox base URL `https://api-m.sandbox.paypal.com` (Orders v2 and Payments v2).
- **Hosting:** backend on Render (web service), frontend on Render static site or Vercel. Judges need a hosted URL or a clean local setup.

## 5. Repository structure

A monorepo with two code folders (`frontend/` and `backend/`) plus non-code folders for docs and data. No other code folders are needed.

```
recallrelay/
  README.md            setup, run, architecture, AI tools used
  LICENSE              MIT
  .gitignore
  package.json         optional root scripts: dev (runs both), test
  docs/
    SPEC.md            this document
    DECISIONS.md       assumptions made while building
    demo-script.md     video script
  data/
    sample-notices/    5+ fictional notice variants (.txt)
    seed.json          catalog and demo orders
  backend/
    package.json
    .env.example
    src/
      index.ts         Express app and startup
      config.ts        env loading and validation
      db.ts            schema creation and queries
      paypal/
        client.ts      OAuth token fetch and cache, request helper
        orders.ts      create order, capture order
        refunds.ts     refund capture, get refund
      ai/
        model.ts       callModel wrapper
        extract.ts     prompt, parsing, zod validation
        verifyEvidence.ts  checks quotes appear in the notice
      logic/
        lots.ts        lot parsing and range matching (pure)
        plan.ts        buckets and refund calculation (pure)
      routes/            health, admin, orders, recalls, paypalReturn
      seed/seed.ts       creates demo orders in PayPal and DB
    tests/               vitest unit tests
  frontend/
    package.json
    .env.example
    src/
      main.tsx, App.tsx
      api.ts             typed fetch wrappers
      pages/             Setup, Notice, Review, Result
      components/        EvidenceHighlight, OrderBucket, StatusBadge
```

## 6. Environment variables

**backend/.env.example**

```
PORT=4000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
AI_API_KEY=
AI_MODEL=
DATABASE_PATH=./recallrelay.db
```

**frontend/.env.example**

```
VITE_API_URL=http://localhost:4000
```

The backend must refuse to start if a required variable is missing, and must refuse any `PAYPAL_BASE_URL` that is not the sandbox host.

## 7. Data model (SQLite)

All money is stored as integer cents. Convert to a string like `24.00` only when calling PayPal or rendering.

- **catalog**: `sku` (PK), `name`, `unit_price_cents`.
- **orders**: `id` (PK), `customer_name`, `customer_email`, `paypal_order_id`, `paypal_capture_id` (nullable), `status` (`CREATED`, `AWAITING_APPROVAL`, `CAPTURED`, `FAILED`), `total_cents`, `currency` (USD), `created_at`.
- **order\_lines**: `id` (PK), `order_id` (FK), `sku`, `name`, `qty`, `unit_price_cents`, `lot_number` (nullable text).
- **recalls**: `id` (PK), `notice_text`, `extraction_json`, `sku`, `lot_prefix`, `lot_start`, `lot_end` (all nullable until set), `status` (`DRAFT`, `APPROVED`, `COMPLETED`), `created_at`.
- **refunds**: `id` (PK), `recall_id` (FK), `order_id` (FK), `amount_cents`, `attempt` (integer, starts at 1), `paypal_request_id`, `paypal_refund_id` (nullable), `status` (`INITIATED`, `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`), `error` (nullable), `created_at`, `updated_at`. **UNIQUE(recall\_id, order\_id)**.

## 8. Seed data (fictional)

Catalog:

- `PB-340` Brindle Creamy Peanut Butter 340g, $24.00
- `OL-500` Olive Oil 500ml, $22.00
- `HN-250` Wildflower Honey 250g, $12.00
- `TB-100` Herbal Tea Box, $16.00

Demo orders (no tax or shipping, so totals are simple):

- **Order 1** (Asha Patel): 1 x `PB-340` lot `B-214`, 2 x `OL-500`. Total **$68.00**. Expected: confirmed, refund $24.00.
- **Order 2** (Rohan Mehta): 1 x `PB-340` lot `B-310`, 2 x `HN-250`. Total **$48.00**. Expected: unaffected, no action.
- **Order 3** (Meera Shah): 1 x `PB-340` lot missing (null), 1 x `TB-100`. Total **$40.00**. Expected: uncertain, flagged for review.

Sample notice (store as `data/sample-notices/notice-01.txt`, and create 4+ differently worded variants, including one with a lot list instead of a range, one with a different SKU, and one with an ambiguous date or lot format):

```
URGENT PRODUCT RECALL NOTICE
Brindle Pantry Co. (fictional)
Date: 5 November 2026

Brindle Pantry Co. is recalling Brindle Creamy Peanut Butter 340g
(SKU PB-340) because of possible contamination during packaging.
Affected lot numbers: B-200 through B-250. Lots outside this range
are not affected. Please remove affected stock from sale and refund
customers for the affected jars.
```

## 9. AI extraction spec

**Job of the AI:** read the notice text and return structured fields with verbatim supporting quotes. It does nothing else. It does not decide refunds.

**Output fields (validate with zod):**

- `sku` (string or null)
- `product_name` (string or null)
- `lot_prefix` (string or null, for example `B-`)
- `lot_start` (integer or null)
- `lot_end` (integer or null)
- `extra_lots` (array of full lot strings, for notices that list individual lots)
- `evidence` (array of objects: `field` and `quote`, where `quote` is copied exactly from the notice)
- `ambiguities` (array of strings describing anything unclear)
- `confidence` (`high`, `medium` or `low`)

Example output:

```
{"sku":"PB-340","product_name":"Brindle Creamy Peanut Butter 340g","lot_prefix":"B-","lot_start":200,"lot_end":250,"extra_lots":[],"evidence":[{"field":"sku","quote":"(SKU PB-340)"},{"field":"lot_range","quote":"B-200 through B-250"}],"ambiguities":[],"confidence":"high"}
```

**System prompt requirements:** extract only what the notice states; never guess; use null for anything missing; copy quotes verbatim; list every ambiguity; return JSON only with no markdown fences or commentary.

**Server-side handling after the model responds:**

1. Strip any code fences, parse JSON, validate with zod. On failure retry once, then return a clear error.
2. Evidence verification: for each evidence item, check that the quote appears in the notice (case-insensitive, whitespace-normalized). Add `verified: true/false` to each item. Unverified evidence is shown to the user with a warning.
3. If the SKU is not in the catalog, block the plan and show a message asking the merchant to correct it.
4. If the lot range is incomplete (missing start or end, and no extra lots), the recall cannot produce confirmed orders; show a clear message.
5. The merchant can edit `sku`, `lot_prefix`, `lot_start`, `lot_end` before approval. Edits are saved and the plan is recomputed.

## 10. Matching and refund logic (pure functions, fully unit tested)

**Lot parsing (`logic/lots.ts`):** a lot number is a prefix plus an integer, such as `B-214`. `parseLot(str)` returns `{prefix, number}` or null if it cannot be parsed. `lotInRecall(lot, recall)` returns:

- `affected` if the lot matches `extra_lots` exactly, or its prefix equals `lot_prefix` and its number is between `lot_start` and `lot_end` inclusive
- `unaffected` if it parses and is clearly outside the recall (same prefix, number outside range)
- `uncertain` if the lot is null, empty, unparseable, or has a different prefix format

**Line classification (`logic/plan.ts`):**

- Line SKU differs from the recall SKU: `not_applicable` (ignored).
- Line SKU matches: classify by `lotInRecall`.

**Order bucket:**

- `confirmed` if it has at least one affected line.
- `uncertain` if it has no affected lines but at least one uncertain line.
- `unaffected` otherwise.

**Refund amount:** for a confirmed order, the sum of `qty * unit_price_cents` over affected lines only. Never the whole basket. Guards: the order must have a `paypal_capture_id`, and the amount must not exceed the captured total minus any refund already made.

**Each order in the plan includes** a plain-language reason, for example: `Lot B-214 is inside the recalled range B-200 to B-250` or `No lot number recorded for this SKU. Manual review needed.`

**Required unit tests:**

- Lot at start, end, just below, and just above the range.
- Missing lot, empty string, garbage string, different prefix (`A-214`).
- An order with two affected lines of the same SKU sums both.
- A recalled SKU not present in an order is ignored.
- The three demo orders produce exactly: refund 2400 cents for order 1, none for order 2, review flag for order 3.
- Refund amount never exceeds the captured amount.

## 11. PayPal integration (sandbox)

**Setup (done by a human, not the agent):** developer.paypal.com, log in, open Sandbox accounts (a business account and a personal buyer account are created by default), then Apps and Credentials, create an app, and copy the client ID and secret into `backend/.env`.

**`paypal/client.ts`:** get an OAuth token with `POST /v1/oauth2/token`, Basic auth (client ID and secret), body `grant_type=client_credentials`. Cache the token in memory until shortly before expiry. Provide one request helper that attaches the bearer token and throws typed errors containing PayPal's `debug_id`.

**Create order (`POST /v2/checkout/orders`):** `intent: CAPTURE`, one purchase unit with `amount` (currency `USD`, value as a string like `68.00`), and `application_context` or `payment_source` return and cancel URLs pointing at the backend `GET /api/paypal/return` route. Use the approval link from the response `links` (the one with rel `approve` or `payer-action`).

**Capture order (`POST /v2/checkout/orders/{id}/capture`):** after the sandbox buyer approves, capture. Save the capture ID from `purchase_units[0].payments.captures[0].id` into `orders.paypal_capture_id`, and mark the order `CAPTURED`.

**Refund (`POST /v2/payments/captures/{capture_id}/refund`):** body contains `amount` (`value` and `currency_code`) for a partial refund, plus an optional `note_to_payer`. Send the header `PayPal-Request-Id` with a deterministic key such as `recall-{recallId}-order-{orderId}-attempt-{attempt}`. The response gives the refund `id` and `status` (`COMPLETED`, `PENDING`, `FAILED` or `CANCELLED`). Store both.

**Get refund (`GET /v2/payments/refunds/{id}`):** used to refresh status of a `PENDING` refund and to confirm after an ambiguous network failure.

**Idempotency (two layers):**

1. The database `UNIQUE(recall_id, order_id)` constraint on `refunds`. Insert the row with status `INITIATED` before calling PayPal. If a row already exists with `COMPLETED` or `PENDING`, skip and return it.
2. The deterministic `PayPal-Request-Id`. If a call times out, retry with the same attempt number so PayPal deduplicates, and confirm with Get refund.
3. Only a `FAILED` row may be retried, by incrementing `attempt` (which changes the request ID).

**Verify exact request and response field names against the PayPal docs and with Postman before coding against them.**

## 12. Backend API

All responses are JSON. Enable CORS for `FRONTEND_URL`.

- `GET /api/health`: returns ok.
- `POST /api/admin/seed`: creates the 3 demo orders in PayPal and the DB, returns each order with its approval link and status `AWAITING_APPROVAL`. Idempotent: if orders already exist, return them.
- `GET /api/paypal/return?token={paypalOrderId}`: buyer redirect target. Captures the order, stores the capture ID, then redirects to `FRONTEND_URL/setup`.
- `POST /api/admin/reset`: deletes refunds, recalls, orders and order lines, then re-runs seeding to create fresh orders. Required because a refund cannot be undone and the demo must be repeatable.
- `GET /api/orders`: all orders with lines, capture status and refunded amounts.
- `POST /api/recalls/extract` with `{ noticeText }`: creates a `DRAFT` recall, runs AI extraction and evidence verification, returns the recall with extraction.
- `PATCH /api/recalls/:id` with edited `sku`, `lot_prefix`, `lot_start`, `lot_end`: saves the edits.
- `GET /api/recalls/:id/plan`: returns buckets, per-order reasons, refund amounts, total refund, and any blocking problems.
- `POST /api/recalls/:id/approve`: recomputes the plan server-side, then executes refunds for confirmed orders with the idempotency rules. Returns per-order results. Safe to call repeatedly.
- `GET /api/recalls/:id/refunds`: refund rows with PayPal refund IDs and statuses. Refreshes any `PENDING` ones from PayPal.

## 13. Frontend screens

Keep the design clean and calm: a single column layout, clear status badges (green confirmed, grey unaffected, amber uncertain), and readable amounts.

1. **Setup (`/setup`):** shows the three demo orders with status. Buttons: Seed demo orders and Reset demo. For each order awaiting approval, show an Approve in PayPal sandbox link. A banner explains this step is only to prepare demo data.
2. **Notice upload (`/`):** a text area to paste a notice, a file picker for `.txt`, and a Use sample notice dropdown. Button: Extract. After extraction, show the extracted fields as editable inputs, with the supporting quotes highlighted inside the notice text. Show ambiguity warnings and unverified-evidence warnings. Button: Continue to review.
3. **Order review and approval (`/review/:recallId`):** three groups (Confirmed, Uncertain, Unaffected). Each order card shows customer, basket total, affected lines, the reason sentence, and the computed refund. A summary shows the total refund. Uncertain orders show a Needs manual review label and are never refunded. Button: Approve refunds, with a confirmation dialog stating the exact total.
4. **Refund result (`/result/:recallId`):** a table of refunded orders with amount, PayPal refund ID, status badge and timestamp. Shows that retries are safe. A Refresh status button for pending refunds. Failed refunds show the error and a Retry button.

Loading, empty and error states are required on every screen. No screen may show raw error stack traces.

## 14. Failure cases to handle

- Order has the recalled SKU but no lot number: route to the uncertain bucket, never refund.
- Merchant clicks Approve twice, or retries after a network error: no duplicate refund (section 11).
- Extracted SKU not in catalog: block the plan with a clear message.
- AI returns invalid JSON: retry once, then show a friendly error.
- AI quote not found in the notice: mark unverified and warn.
- PayPal refund returns `FAILED`: store the failure, show it, allow retry with a new attempt.
- Refund amount would exceed the captured amount: block.
- Order never captured (buyer did not approve): excluded from refunds with an explanation.

## 15. Build order for two people

**Person A (backend, PayPal and AI):** `backend/` folder, PayPal integration, AI extraction, logic and tests, seed and reset, backend deployment. **Person B (frontend, data and submission):** `frontend/` folder, sample notices and seed data, README, demo video, frontend deployment, Devpost submission. Both: QA, rehearsal, and fixing bugs found by the other person.

Agree the API shapes in section 12 and the AI output fields in section 9 on day 1, so both sides can work in parallel against the same contract (Person B can use mocked responses until the backend is ready).

**Day 1 (Sat 7 Nov):** repo, license, scaffolding for both folders, PayPal sandbox accounts and credentials, one successful create, approve and capture in Postman, first extraction prompt tested on the sample notice. **Day 2 (Sun 8 Nov):** A builds the DB, seed script, capture route, refund function, and lot and plan logic with tests. B builds the Setup and Notice screens against mocked data, and writes 5+ notice variants. **Day 3 (Mon 9 Nov):** integration. The full happy path works locally with a real sandbox refund. B builds Review and Result screens. This is the most important milestone. **Day 4 (Tue 10 Nov):** failure cases, idempotency checks, reset script, ambiguity handling, UI polish and states, deploy backend and frontend, test on the hosted URLs. **Day 5 (Wed 11 Nov):** feature freeze at noon IST. Bug fixes only. Finish the README and test it from a clean clone. Rehearse and record the demo video. **Day 6 (Thu 12 Nov):** buffer. Re-record if needed, upload to YouTube as public, finish the Devpost form, and submit by 3 PM IST. Re-test the hosted app after submitting.

## 16. Hosting notes

- Free hosting tiers may sleep when idle and may lose local files on redeploy. Because SQLite lives on disk, make startup safe: create tables if missing and offer the admin reset and seed so the demo can be rebuilt in under a minute.
- Wake the hosted app before judging time and before recording.
- CORS and the PayPal return URL must use the hosted backend URL in production (`BACKEND_URL`).

## 17. README requirements

The README must contain: a short project description, the problem it solves, a feature list, an architecture diagram or description, exact local setup steps (clone, install, env vars, run), how to create the PayPal sandbox app, how to seed and reset demo data, how to run tests, a section listing the AI tools used and how, the hosted demo URL, and the license. Someone who has never seen the project should be able to run it from a clean clone.

## 18. Demo video script (under 3 minutes)

- 0:00 to 0:20: the problem (a recall notice arrives, refunds must be exact).
- 0:20 to 0:55: upload the notice, show AI extraction with highlighted evidence.
- 0:55 to 1:30: three orders sorted into confirmed, unaffected and uncertain, with reasons.
- 1:30 to 2:15: approve, and show the $24.00 of $68.00 PayPal sandbox refund with ID and status.
- 2:15 to 2:40: retry approval and show no duplicate refund.
- 2:40 to 3:00: how PayPal and AI are used, then close.

Show the app running on screen. No other companies' logos and no copyrighted music.

## 19. Out of scope (do not build)

Authentication and user accounts, real inventory systems, tax or shipping calculation, multi-currency, live PayPal credentials, email sending, PDF parsing, and PayPal webhooks (polling refund status is sufficient). These may be added only after the acceptance test passes and everything else is finished.
