import { SANDBOX_URL } from '../../src/config.js'

export const testEnv = {
  PORT: '4000', FRONTEND_URL: 'http://localhost:5173', BACKEND_URL: 'http://localhost:4000',
  PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'test-secret', PAYPAL_BASE_URL: SANDBOX_URL,
  AI_API_KEY: 'test-key', AI_MODEL: 'test-model', DATABASE_PATH: ':memory:',
}
