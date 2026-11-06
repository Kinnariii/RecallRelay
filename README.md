# RecallRelay

RecallRelay helps a small retailer turn a supplier recall notice into an evidence-backed refund plan. It separates affected orders from untouched orders and orders that need a lot check. The merchant confirms the exact amount before the sandbox issues a partial refund.

## Run locally

Use Node.js 24 and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. The root route opens notice upload. Visit `/home` for the walkthrough or `/setup` to prepare orders. From the repository root, `npm run dev:frontend` starts the same frontend after installation.

## Mock walkthrough

Mock mode is the default and runs without a backend or credentials.

1. In **Demo Setup**, seed the orders and approve all three simulated sandbox payments.
2. Continue to notice upload. Paste [the first sample notice](data/sample-notices/notice-01.txt), upload it as a text file, or select it from the sample menu. Click **Extract with AI**.
3. Verify the highlighted SKU and lot range. Continue to Review. Asha Patel’s affected line is **$24.00** of a **$68.00** order. Rohan Mehta’s order is unaffected. Meera Shah’s order needs manual review.
4. Approve refunds, check the consent box, and confirm **$24.00**. Result displays the simulated refund ID and its completed status.
5. Click **Approve again**. The same ID remains and the app reports that it created no duplicate.
6. Use **Reset demo** to clear the demo and create fresh orders.

The mock stores its orders, recalls, plans, and refund rows in browser storage. To demonstrate retry, reset the demo, then load `/?mockfail=1` directly in the browser before extracting. The first eligible refund fails once, and **Retry refund (new attempt)** changes the request ID and completes the refund.

## Switch to the real backend

Copy [frontend/.env.example](frontend/.env.example) to `frontend/.env`. Set the following and restart Vite:

```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:4000
```

`VITE_USE_MOCK=false` selects the HTTP adapter. Change `VITE_API_URL` if the backend runs elsewhere. Vite reads these variables at startup and at build time. Put credentials in the backend environment only.

The backend teammate should implement the [API contract](docs/API_CONTRACT.md). For sandbox integration, create an app under Apps and Credentials in the developer dashboard, then configure its sandbox client ID, secret, and buyer account on the backend. The backend handles the approval redirect and capture. The setup and sandbox environment variables are described in [the build specification](docs/SPEC.md).

To run the local HTTP contract stub, run `npm run stub` in a second terminal from `frontend/`. The stub starts on port 4000, seeds pre-captured orders, and serves scripted demo responses. It is for frontend integration checks.

## Architecture

React Router drives the four-step workflow. Both adapters validate responses with Zod. The mock adapter simulates extraction, matching, and refund requests in `frontend/src/mocks/`. In HTTP mode, the backend owns extraction, classification, refundable amounts, and refund execution. The frontend formats integer cents for display and uses the server’s plan and refund records. The Stitch exports live in [design/stitch](design/stitch/) and the implementation choices are recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Verify

Run from `frontend/`:

```sh
npm run lint
npm test
npm run build
npx playwright install chromium --only-shell
npm run test:e2e
npm run test:real
```

`lint` runs the strict TypeScript check with unused declarations and parameters enabled. The first browser test runs the mock acceptance flow. The second starts a separate Vite instance and a local HTTP stub to exercise reconnection, edits, refund retry, and polling.

## AI tools

- Codex was used to implement and test the frontend.
- Mock extraction uses deterministic notice parsing. In real mode the backend supplies AI extraction and evidence verification through the API contract.

## License

[MIT](LICENSE).
