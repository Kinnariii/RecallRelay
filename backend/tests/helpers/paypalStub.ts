import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import assert from 'node:assert/strict'
import { SANDBOX_URL } from '../../src/config.js'

export async function startPayPalStub() {
  const orderByKey = new Map<string, { id: string; amount: { currency_code: string; value: string } }>()
  const orders = new Map<string, { currency_code: string; value: string }>()
  const calls = { oauth: 0, order: 0, capture: 0 }
  type Amount = { currency_code: string; value: string }
  type Refund = { id: string; status: 'COMPLETED' | 'PENDING' | 'FAILED'; amount: Amount }
  const refunds = new Map<string, Refund>()
  const controls = {
    nextRefund: 'complete' as 'complete' | 'timeout' | 'failed' | 'pending',
    beforeRefund: undefined as (() => void) | undefined,
    refundPosts: [] as string[], refundGets: [] as string[], refundAmounts: [] as Amount[],
    uniqueRefunds: () => refunds.size,
    settle(id: string) {
      const row = [...refunds.values()].find(refund => refund.id === id)
      assert(row)
      row.status = 'COMPLETED'
    },
  }
  const captureDetails = (id: string) => ({
    id, status: 'COMPLETED', purchase_units: [{ payments: { captures: [{
      id: `cap-${id}`, status: 'COMPLETED', amount: orders.get(id),
    }] } }],
  })
  async function handle(req: IncomingMessage, res: ServerResponse) {
    function respond(status: number, json: unknown) {
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(json))
    }
    let raw = ''
    for await (const chunk of req) raw += String(chunk)
    const path = req.url ?? ''

    if (path === '/v1/oauth2/token' && req.method === 'POST') {
      assert.match(req.headers.authorization ?? '', /^Basic /)
      assert.equal(raw, 'grant_type=client_credentials')
      calls.oauth++
      return respond(200, { access_token: 'stub-oauth-token', token_type: 'Bearer', expires_in: 3600 })
    }
    assert.equal(req.headers.authorization, 'Bearer stub-oauth-token')
    if (path === '/v2/checkout/orders' && req.method === 'POST') {
      const key = req.headers['paypal-request-id']
      assert(typeof key === 'string')
      const { intent, purchase_units, payment_source } = JSON.parse(raw)
      const experience = payment_source.paypal.experience_context
      assert.equal(intent, 'CAPTURE')
      assert.equal(new URL(experience.return_url).pathname, '/api/paypal/return')
      assert.equal(new URL(experience.cancel_url).searchParams.get('cancelled'), '1')
      const existing = orderByKey.get(key)
      const order = existing ?? { id: `stub-order-${orders.size + 1}`, amount: purchase_units[0].amount }
      calls.order++
      orderByKey.set(key, order)
      orders.set(order.id, order.amount)
      return respond(existing ? 200 : 201, {
        id: order.id, status: 'PAYER_ACTION_REQUIRED',
        links: [{ href: `https://www.sandbox.paypal.com/checkoutnow?token=${order.id}`, rel: 'payer-action', method: 'GET' }],
      })
    }
    const match = /^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/.exec(path)
    if (match && orders.has(match[1])) {
      if (match[2] && req.method === 'POST') {
        assert.equal(req.headers['paypal-request-id'], `capture-${match[1]}`)
        calls.capture++
        return respond(201, captureDetails(match[1]))
      }
      if (req.method === 'GET') return respond(200, captureDetails(match[1]))
    }
    const captureRefund = /^\/v2\/payments\/captures\/cap-([^/]+)\/refund$/.exec(path)
    if (captureRefund && orders.has(captureRefund[1]) && req.method === 'POST') {
      const key = req.headers['paypal-request-id']
      assert(typeof key === 'string' && key.length <= 38)
      const { amount, note_to_payer } = JSON.parse(raw)
      assert.match(note_to_payer, /supplier recall/)
      controls.refundPosts.push(key)
      controls.refundAmounts.push(amount)
      controls.beforeRefund?.()
      const existing = refunds.get(key)
      if (existing) {
        assert.deepEqual(existing.amount, amount)
        return respond(200, existing)
      }
      const scenario = controls.nextRefund
      controls.nextRefund = 'complete'
      const refund: Refund = {
        id: `stub-refund-${refunds.size + 1}`, amount,
        status: scenario === 'failed' ? 'FAILED' : scenario === 'pending' ? 'PENDING' : 'COMPLETED',
      }
      refunds.set(key, refund)
      if (scenario === 'timeout') {
        setTimeout(() => { if (!res.destroyed) respond(201, refund) }, 1000).unref()
        return
      }
      return respond(201, refund)
    }
    const refundPath = /^\/v2\/payments\/refunds\/([^/]+)$/.exec(path)
    if (refundPath && req.method === 'GET') {
      controls.refundGets.push(refundPath[1])
      const refund = [...refunds.values()].find(item => item.id === refundPath[1])
      if (refund) return respond(200, refund)
    }
    respond(404, { name: 'RESOURCE_NOT_FOUND', debug_id: 'stub-debug' })
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch(error => {
      res.writeHead(500).end()
      failure = error
    })
  })
  let failure: unknown
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Stub could not listen.')
  const transport: typeof fetch = (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin, SANDBOX_URL)
    return fetch(`http://127.0.0.1:${address.port}${url.pathname}`, init)
  }

  return Object.assign(controls, {
    transport, calls,
    async close() {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
      if (failure) throw failure
    },
  })
}
