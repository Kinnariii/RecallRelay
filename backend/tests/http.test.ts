import request from 'supertest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openDb, type Db } from '../src/db.js'
import { testEnv } from './helpers/config.js'
import { sampleExtractions } from './helpers/notices.js'

let db: Db
const config = readConfig(testEnv)
const model = async () => JSON.stringify(sampleExtractions[0])
beforeEach(() => { db = openDb(':memory:') })
afterEach(() => db.close())

it('allows the configured CORS preflight and rejects foreign mutations and non-JSON bodies', async () => {
  const api = request(createApp(config, db, { model }))
  await api.options('/api/recalls/demo').set('Origin', config.FRONTEND_URL)
    .set('Access-Control-Request-Method', 'PATCH').expect(204)
    .expect('Access-Control-Allow-Origin', config.FRONTEND_URL)
  await api.post('/api/admin/reset').set('Origin', 'https://outside.example.test').expect(403)
  await api.post('/api/recalls/demo/approve').type('text/plain').send('amount=1').expect(415)
  await api.post('/api/recalls/extract').type('json').send('{').expect(400)
  await api.post('/api/recalls/extract').send({ noticeText: 'x'.repeat(140_000) }).expect(413)
})

it('rate limits extract and approve independently and sends Retry-After', async () => {
  const callModel = vi.fn(model)
  const api = request(createApp(config, db, { model: callModel }))
  for (let n = 0; n < 8; n++) await api.post('/api/recalls/extract').send({ noticeText: 'fictional notice' }).expect(200)
  await api.post('/api/recalls/extract').send({ noticeText: 'fictional notice' }).expect(429).expect('Retry-After', /\d+/)
  expect(callModel).toHaveBeenCalledTimes(8)
  for (let n = 0; n < 30; n++) await api.post('/api/recalls/absent/approve').expect(404)
  await api.post('/api/recalls/absent/approve').expect(429).expect('Retry-After', /\d+/)
})

it('logs route templates while excluding notice text, query tokens, headers, and arbitrary paths', async () => {
  const log = vi.fn<(message: string) => void>()
  const api = request(createApp(config, db, { model, log }))
  await api.post('/api/recalls/extract').set('Authorization', 'Bearer hidden-auth').send({ noticeText: 'hidden-notice' }).expect(200)
  await api.get('/api/paypal/return').query({ token: 'hidden-token' }).expect(404)
  await api.get('/hidden-path').expect(404)
  const lines = log.mock.calls.map(([line]) => line)
  expect(lines).toEqual([
    expect.stringMatching(/^\[http\] POST \/recalls\/extract 200 \d+ms$/),
    expect.stringMatching(/^\[http\] GET \/paypal\/return 404 \d+ms$/),
    expect.stringMatching(/^\[http\] GET unmatched 404 \d+ms$/),
  ])
  expect(lines.join(' ')).not.toContain('hidden-')
})
