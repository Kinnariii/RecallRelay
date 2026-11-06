import { mkdtempSync, rmSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openDb, type Db } from '../src/db.js'
import type { Order, RefundRow } from '../src/types.js'
import { testEnv } from './helpers/config.js'
import { notice, sampleExtractions } from './helpers/notices.js'
import { startPayPalStub } from './helpers/paypalStub.js'

describe('refund approval', () => {
  let stub: Awaited<ReturnType<typeof startPayPalStub>>
  let db: Db
  let api: ReturnType<typeof request>
  let path: string
  let directory: string
  let database: string
  const config = readConfig(testEnv)
  const createApi = () => request(createApp(config, db, {
    paypalFetch: stub.transport, paypalTimeoutMs: 250, model: async () => JSON.stringify(sampleExtractions[0]),
  }))

  beforeEach(async () => {
    stub = await startPayPalStub()
    directory = mkdtempSync(join(tmpdir(), 'recallrelay-test-'))
    database = join(directory, 'demo.db')
    db = openDb(database)
    api = createApi()
    const orders: Order[] = (await api.post('/api/admin/seed').expect(200)).body.orders
    for (const order of orders) await api.get('/api/paypal/return').query({ token: order.paypal_order_id }).expect(303)
    const { recall } = (await api.post('/api/recalls/extract').send({ noticeText: notice(1) }).expect(200)).body
    path = `/api/recalls/${recall.id}`
  })

  afterEach(async () => {
    db.close()
    try { await stub.close() } finally {
      for (const suffix of ['', '-shm', '-wal']) rmSync(database + suffix, { force: true })
      rmdirSync(directory)
    }
  })

  it('authorizes the exact affected line once, including simultaneous and later approval', async () => {
    stub.beforeRefund = () => {
      expect(db.prepare('SELECT status, amount_cents FROM refunds').get()).toEqual({ status: 'INITIATED', amount_cents: 2400 })
    }
    const { plan } = (await api.get(`${path}/plan`).expect(200)).body
    expect(plan.orders.map((order: { bucket: string }) => order.bucket)).toEqual(['confirmed', 'unaffected', 'uncertain'])
    expect(plan.total_refund_cents).toBe(2400)
    const concurrent = await Promise.all([api.post(`${path}/approve`).expect(200), api.post(`${path}/approve`).expect(200)])
    const results: RefundRow[] = concurrent.map(response => response.body.results[0])
    expect(results.map(row => row.already_existed).sort()).toEqual([false, true])
    expect(new Set(results.map(row => row.paypal_refund_id)).size).toBe(1)
    const row = results[0]
    expect(row).toMatchObject({ order_id: '1', amount_cents: 2400, status: 'COMPLETED', attempt: 1 })
    expect(row.paypal_request_id).toBe(`recall-${row.recall_id}-order-1-attempt-1`)
    expect(stub.refundPosts).toEqual([row.paypal_request_id])
    expect(stub.refundAmounts).toEqual([{ currency_code: 'USD', value: '24.00' }])
    await api.get(`${path}/plan`).expect(200, { plan })
    await api.post(`${path}/approve`).expect(200, { plan, results: [{ ...row, already_existed: true }] })
    const { orders }: { orders: Order[] } = (await api.get('/api/orders').expect(200)).body
    expect(orders.map(order => order.refunded_cents)).toEqual([2400, 0, 0])
    await api.patch(path).send({ sku: 'PB-340', lot_prefix: 'B-', lot_start: 200, lot_end: 251 }).expect(409)
  })

  it('recovers a lost response across service restart with the same key and a refund lookup', async () => {
    stub.nextRefund = 'timeout'
    const first = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    expect(first).toMatchObject({ status: 'INITIATED', paypal_refund_id: null, attempt: 1 })
    db.close()
    db = openDb(database)
    api = createApi()
    const second = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    expect(second).toMatchObject({ id: first.id, attempt: 1, status: 'COMPLETED', already_existed: true })
    expect(stub.refundPosts).toEqual([first.paypal_request_id, first.paypal_request_id])
    expect(stub.refundGets).toEqual([second.paypal_refund_id])
    expect(stub.uniqueRefunds()).toBe(1)
  })

  it('blocks amounts above remaining captured balance without submitting a refund', async () => {
    db.prepare('UPDATE orders SET total_cents = 2399 WHERE id = ?').run('1')
    const { plan } = (await api.get(`${path}/plan`).expect(200)).body
    expect(plan.total_refund_cents).toBe(0)
    expect(plan.blocking_problems).toHaveLength(1)
    await api.post(`${path}/approve`).expect(409).expect(response => expect(response.body.error.code).toBe('PLAN_BLOCKED'))
    expect(stub.refundPosts).toHaveLength(0)
  })

  it('rejects browser-supplied amounts and other fields', async () => {
    await api.post(`${path}/approve`).send({ amount_cents: 1 }).expect(400)
    expect(stub.refundPosts).toHaveLength(0)
  })

  it('holds an old ambiguous request for reconciliation instead of making a new payment', async () => {
    stub.nextRefund = 'timeout'
    const first = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    db.prepare('UPDATE refunds SET attempt_submitted_at = ?').run('2020-01-01T00:00:00.000Z')
    const repeat = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    expect(repeat).toMatchObject({ status: 'INITIATED', attempt: 1, error: 'REFUND_RECONCILIATION_REQUIRED' })
    expect(stub.refundPosts).toEqual([first.paypal_request_id])
    expect(stub.uniqueRefunds()).toBe(1)
  })

  it('refreshes pending refunds and repeat approval leaves them alone', async () => {
    await api.get(`${path}/refunds`).expect(200, { refunds: [] })
    stub.nextRefund = 'pending'
    const row: RefundRow = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    expect(row.status).toBe('PENDING')
    await api.post(`${path}/approve`).expect(200).expect(response => {
      expect(response.body.results[0]).toEqual({ ...row, already_existed: true })
    })
    expect(stub.refundPosts).toHaveLength(1)
    expect(stub.refundGets).toHaveLength(0)
    stub.settle(row.paypal_refund_id!)
    await api.get(`${path}/refunds`).expect(200).expect(response => {
      expect(response.body.refunds).toEqual([expect.objectContaining({
        id: row.id, paypal_refund_id: row.paypal_refund_id, status: 'COMPLETED',
      })])
    })
    await api.get(`${path}/refunds`).expect(200)
    expect(stub.refundGets).toEqual([row.paypal_refund_id])
  })

  it('retries a failed refund with a new attempt and prevents a second successful retry', async () => {
    stub.nextRefund = 'failed'
    const row: RefundRow = (await api.post(`${path}/approve`).expect(200)).body.results[0]
    expect(row).toMatchObject({ status: 'FAILED', attempt: 1, error: 'REFUND_FAILED' })
    await api.post(`${path}/approve`).expect(200)
    expect(stub.refundPosts).toEqual([row.paypal_request_id])
    const retry = `${path}/refunds/${row.order_id}/retry`
    await api.post(retry).send({ amount_cents: 100 }).expect(400)
    const results = await Promise.all([api.post(retry), api.post(retry)])
    expect(results.map(result => result.status).sort()).toEqual([200, 409])
    const refund: RefundRow = results.find(result => result.status === 200)!.body.refund
    expect(refund).toMatchObject({ id: row.id, status: 'COMPLETED', attempt: 2, amount_cents: 2400 })
    expect(refund.paypal_request_id).toBe(`recall-${row.recall_id}-order-${row.order_id}-attempt-2`)
    await api.get(`${path}/refunds`).expect(200, { refunds: [refund] })
    expect(stub.refundPosts).toEqual([row.paypal_request_id, refund.paypal_request_id])
  })

  it('reserves balance across recalls while the first provider request is unresolved', async () => {
    db.prepare('UPDATE orders SET total_cents = 3000 WHERE id = ?').run('1')
    const { recall } = (await api.post('/api/recalls/extract').send({ noticeText: notice(1) }).expect(200)).body
    stub.nextRefund = 'timeout'
    const pending = api.post(`${path}/approve`).expect(200).then(response => response.body)
    await vi.waitFor(() => expect(stub.refundPosts).toHaveLength(1), { interval: 5 })
    await api.post(`/api/recalls/${recall.id}/approve`).expect(409)
    await pending
    expect(stub.refundPosts).toHaveLength(1)
  })
})
