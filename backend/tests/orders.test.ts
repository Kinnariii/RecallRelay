import request from 'supertest'
import { expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openDb } from '../src/db.js'
import { testEnv } from './helpers/config.js'
import { startPayPalStub } from './helpers/paypalStub.js'

it('seeds idempotently, captures once, and resets to fresh awaiting orders', async () => {
  const stub = await startPayPalStub()
  const config = readConfig(testEnv)
  const db = openDb(config.DATABASE_PATH)
  try {
    const api = request(createApp(config, db, { paypalFetch: stub.transport }))
    await api.get('/api/orders').expect(200, { orders: [] })
    const seeded = (await api.post('/api/admin/seed').expect(200)).body.orders
    expect(seeded.map((order: { total_cents: number }) => order.total_cents)).toEqual([6800, 4800, 4000])
    expect(seeded[0]).toMatchObject({ status: 'AWAITING_APPROVAL', paypal_capture_id: null, refunded_cents: 0 })
    await api.post('/api/admin/seed').expect(200, { orders: seeded })
    expect(stub.calls).toEqual({ oauth: 1, order: 3, capture: 0 })

    const token = seeded[0].paypal_order_id
    await api.get('/api/paypal/return').query({ token, cancelled: '1' }).expect(303).expect('Location', config.FRONTEND_URL + '/setup')
    expect(stub.calls.capture).toBe(0)
    await Promise.all(Array.from({ length: 2 }, () =>
      api.get('/api/paypal/return').query({ token }).expect(303).expect('Location', config.FRONTEND_URL + '/setup')))
    expect(stub.calls.capture).toBe(1)
    const captured = (await api.get('/api/orders').expect(200)).body.orders
    expect(captured[0]).toMatchObject({ status: 'CAPTURED', paypal_capture_id: `cap-${token}`, approval_url: null })
    const reset = (await api.post('/api/admin/reset').expect(200)).body.orders
    expect(reset[0].paypal_order_id).not.toBe(token)
    expect(reset[0].status).toBe('AWAITING_APPROVAL')
    await api.get('/api/paypal/return').query({ token }).expect(404)
  } finally {
    db.close()
    await stub.close()
  }
})
