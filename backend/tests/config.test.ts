import request from 'supertest'
import { expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { readConfig, SANDBOX_URL } from '../src/config.js'
import { openDb } from '../src/db.js'

import { testEnv } from './helpers/config.js'

it('rejects missing credentials and alternate PayPal endpoints without echoing their values', () => {
  expect(() => readConfig({ ...testEnv, AI_API_KEY: '' })).toThrow('AI_API_KEY')
  expect(() => readConfig({ ...testEnv, FRONTEND_URL: 'invalid' })).toThrow(/^Invalid or missing configuration: FRONTEND_URL\.$/)
  expect(() => readConfig({ ...testEnv, PAYPAL_BASE_URL: 'https://api-m.paypal.com' })).toThrow(/^Invalid or missing configuration: PAYPAL_BASE_URL\.$/)
  expect(() => readConfig({ ...testEnv, PAYPAL_BASE_URL: SANDBOX_URL + '/' })).toThrow('PAYPAL_BASE_URL')
})

it('starts SQLite with all tables and exposes a JSON health check', async () => {
  const config = readConfig(testEnv)
  const db = openDb(config.DATABASE_PATH)
  try {
    expect(db.prepare('SELECT name FROM sqlite_master WHERE type = ?').pluck().all('table')).toEqual(expect.arrayContaining([
      'catalog', 'orders', 'order_lines', 'recalls', 'refunds',
    ]))
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    const app = createApp(config, db)
    await request(app).get('/api/health').expect(200, { ok: true })
    await request(app).get('/missing').expect(404, { error: { code: 'NOT_FOUND', message: 'Endpoint could not be found.' } })
  } finally {
    db.close()
  }
})
