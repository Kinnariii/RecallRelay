# RecallRelay backend

The Express API owns notice extraction, order matching, and sandbox refunds. SQLite stores the authorized plan and one refund row per recall and order. All stored and API amounts are integer cents. The PayPal adapter converts cents to decimal USD when sending payment requests.

## Setup

Use Node.js 24 and npm. From the repository root:

```sh
cd backend
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` to create the local environment file. Fill in all fields in [.env.example](.env.example). Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.

1. In the developer dashboard, select **Sandbox**, open **Apps & Credentials**, and create or select a REST app. Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from that sandbox app. Under **Sandbox Accounts**, use a personal buyer account for browser approval. [PayPal REST setup](https://developer.paypal.com/api/rest/)
2. Set `AI_API_KEY` and `AI_MODEL` to an OpenAI API key and a model available to that project that supports Structured Outputs in Chat Completions. [OpenAI API reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
3. Use the exact browser origin for `FRONTEND_URL`. Use the address reachable by the buyer’s browser for `BACKEND_URL`. The defaults are `http://localhost:5173` and `http://localhost:4000`.

```sh
npm run dev
```

Check `GET /api/health`. From the repository root, `npm run dev:backend` starts the same service. See the [API contract](../docs/API_CONTRACT.md) for JSON shapes and the [build spec](../docs/SPEC.md) for the demo scenario.

## Sandbox walkthrough

1. Run the frontend in HTTP mode with `VITE_USE_MOCK=false` and the backend URL.
2. In **Demo Setup**, seed the three orders. Approve each as the sandbox buyer. The return route stores each completed capture and redirects to Setup.
3. Use the first sample notice. Review the extracted SKU and lot range. The plan refunds Asha Patel’s affected line for **2,400 cents**. Rohan Mehta’s order stays untouched, and Meera Shah’s needs manual review.
4. Approve and check the provider refund ID and status. **Approve again** returns the existing row.
5. **Reset demo** deletes local recall, order, and refund records and creates fresh awaiting orders. Previously executed sandbox refunds stay in the sandbox account.

For an isolated provider check, run `npm run paypal:smoke`. Open the approval link it prints, approve the $1.00 sandbox checkout as the buyer, then press Enter. The script captures the payment and requests a $0.01 partial refund. The published examples cover the same endpoints. [Official Postman collection](https://www.postman.com/paypal/paypal-public-api-workspace/collection/ujhlb45/paypal-apis)

## Payment recovery

Approval reserves funds and saves the exact plan in one SQLite transaction. Pending and ambiguous submissions continue to reserve their amount. A retry of an ambiguous submission uses the same request ID within a five-minute recovery window. An older unresolved row with `REFUND_RECONCILIATION_REQUIRED` requires checking the original capture in the sandbox dashboard. Only a confirmed failed attempt can start a new request ID. [PayPal idempotency reference](https://developer.paypal.com/api/rest/reference/idempotency/)

## Tests

```sh
npm test
npm run build
npm start
```

Tests use a loopback PayPal HTTP stub and fixture model responses. They cover the five notices, quote verification, capture, concurrent approval, recovery after a lost response, balance checks, pending refresh, and failed retry.

## Render

Create a Node web service from the repository root so the shared `data/` directory is present. Use `npm --prefix backend ci && npm --prefix backend run build` as the build command and `npm --prefix backend start` as the start command. Set the backend environment values in the dashboard and use `/api/health` for the health check. Run one backend instance per SQLite file.

Free web services can sleep and lose local SQLite data. Wake the service before the demo. On a fresh database, **Seed demo orders** rebuilds the three orders. A persistent disk preserves the ledger across restarts. The sandbox demo has unauthenticated admin endpoints, so keep access limited to the intended demo audience. [Render free service limits](https://render.com/docs/free)
