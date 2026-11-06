import { z } from 'zod'
import { SANDBOX_URL, type Config } from '../config.js'
import { AppError } from '../errors.js'

const diagnostic = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)
const errorSchema = z.object({
  name: diagnostic.optional(), error: diagnostic.optional(), debug_id: diagnostic.optional(),
  details: z.array(z.object({ issue: diagnostic })).optional(),
})
const oauthSchema = z.object({
  access_token: z.string().min(1).regex(/^[\x21-\x7e]+$/),
  token_type: z.string().regex(/^bearer$/i),
  expires_in: z.number().int().positive(),
})

export class PayPalError extends AppError {
  constructor(
    public readonly kind: 'timeout' | 'network' | 'http' | 'response',
    public readonly phase: 'auth' | 'request',
    public readonly upstreamStatus?: number,
    public readonly issue?: string,
    public readonly debug_id?: string,
  ) {
    super(502, 'PAYPAL_UNAVAILABLE', 'The sandbox could not complete the request. Please try again.')
    this.name = 'PayPalError'
  }
}

export function createPayPalClient(config: Config, transport: typeof fetch = fetch, timeoutMs = 5500) {
  if (config.PAYPAL_BASE_URL !== SANDBOX_URL) throw new Error('The sandbox API URL is required.')
  let token: { value: string; refreshAt: number } | undefined
  let tokenRequest: Promise<string> | undefined

  async function send<T>(phase: 'auth' | 'request', path: string, schema: z.ZodType<T>, init: RequestInit) {
    const signal = AbortSignal.timeout(timeoutMs)
    let response: Response
    try {
      response = await transport(SANDBOX_URL + path, { ...init, signal, redirect: 'error' })
    } catch {
      throw new PayPalError(signal.aborted ? 'timeout' : 'network', phase)
    }
    const headerId = diagnostic.safeParse(response.headers.get('paypal-debug-id'))
    let data: unknown
    try {
      data = await response.json()
    } catch {
      if (signal.aborted) throw new PayPalError('timeout', phase, response.status, undefined, headerId.data)
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(data).data
      throw new PayPalError('http', phase, response.status,
        parsed?.details?.[0]?.issue ?? parsed?.name ?? parsed?.error,
        parsed?.debug_id ?? headerId.data)
    }
    const parsed = schema.safeParse(data)
    if (!parsed.success) throw new PayPalError('response', phase, response.status, undefined, headerId.data)
    return parsed.data
  }

  function accessToken() {
    if (token && Date.now() < token.refreshAt) return Promise.resolve(token.value)
    if (tokenRequest) return tokenRequest
    const authorization = Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`).toString('base64')
    tokenRequest = send('auth', '/v1/oauth2/token', oauthSchema, {
      method: 'POST', headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      }, body: 'grant_type=client_credentials',
    }).then(({ access_token, expires_in }) => {
      const lifespan = expires_in * 1000
      token = { value: access_token, refreshAt: Date.now() + lifespan - Math.min(30_000, lifespan / 10) }
      return access_token
    }).finally(() => { tokenRequest = undefined })
    return tokenRequest
  }

  return {
    async request<T>(path: `/v2/${string}`, schema: z.ZodType<T>, options?: { body: object; requestId: string }) {
      const sendWithToken = (bearer: string) => send('request', path, schema, {
        method: options ? 'POST' : 'GET',
        headers: {
          Accept: 'application/json', Authorization: `Bearer ${bearer}`,
          ...(options && { 'Content-Type': 'application/json', 'PayPal-Request-Id': options.requestId, Prefer: 'return=representation' }),
        },
        body: options && JSON.stringify(options.body),
      })
      const bearer = await accessToken()
      try {
        return await sendWithToken(bearer)
      } catch (error) {
        if (!(error instanceof PayPalError) || error.upstreamStatus !== 401) throw error
        if (token?.value === bearer) token = undefined
        return sendWithToken(await accessToken())
      }
    },
  }
}

export type PayPalClient = ReturnType<typeof createPayPalClient>
