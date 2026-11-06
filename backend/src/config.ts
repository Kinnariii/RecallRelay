import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

export const SANDBOX_URL = 'https://api-m.sandbox.paypal.com'

const origin = z.string().transform((value, context) => {
  const url = URL.parse(value)
  if (url && /^https?:$/.test(url.protocol) && url.pathname === '/' &&
    !url.username && !url.password && !url.search && !url.hash) return url.origin
  context.addIssue({ code: 'custom', message: 'Expected an HTTP origin.' })
  return z.NEVER
})

const required = z.string().trim().min(1)
const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(65535)),
  FRONTEND_URL: origin,
  BACKEND_URL: origin,
  PAYPAL_CLIENT_ID: required,
  PAYPAL_CLIENT_SECRET: required,
  PAYPAL_BASE_URL: z.literal(SANDBOX_URL),
  AI_API_KEY: required,
  AI_MODEL: required,
  DATABASE_PATH: required,
})

export type Config = z.output<typeof envSchema>

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map(issue => issue.path[0]))].join(', ')
    throw new Error(`Invalid or missing configuration: ${fields}.`)
  }
  return parsed.data
}

export function loadConfig(): Config {
  loadDotenv({ quiet: true })
  return readConfig(process.env)
}
