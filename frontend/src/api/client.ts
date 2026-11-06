import type { ZodType } from 'zod'
import { responses } from './schemas'

const messages: Record<string, string> = {
  NETWORK: 'The sandbox is unreachable. Check your connection and try again.',
  SERVER_WAKING: 'The sandbox is taking longer than expected to respond.',
  INVALID_RESPONSE: 'The sandbox returned an unexpected response. Please try again.',
  NOT_FOUND: 'This recall or order could not be found. It may have been cleared when the demo was reset.',
  INVALID_INPUT: 'Check the highlighted fields and try again.',
  EXTRACTION_FAILED: 'We couldn’t read the recall details. Try again or paste the notice as plain text.',
  PLAN_BLOCKED: 'The refund plan needs attention before you can approve it.',
  RECALL_LOCKED: 'This recall has already been approved.',
  REFUND_NOT_RETRYABLE: 'Only failed refunds can start a new attempt. Refresh the status first.',
  REFUND_FAILED: 'The sandbox couldn’t complete this refund. You can retry it with a new attempt.',
  STORAGE: 'The demo couldn’t save its data in this browser. Check your site storage settings and try again.',
}
const defaultMessage = 'Something went wrong. Please try again.'

export class ApiError extends Error {
  constructor(public readonly code: string, public readonly status?: number) {
    super(Object.hasOwn(messages, code) ? messages[code] : defaultMessage)
    this.name = 'ApiError'
  }
}

export function friendlyError(error: unknown) {
  return error instanceof ApiError ? error.message : defaultMessage
}

export function isWaking(error: unknown) {
  return error instanceof ApiError && ['SERVER_WAKING', 'NETWORK'].includes(error.code)
}

export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new ApiError('INVALID_RESPONSE')
  return parsed.data
}

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export async function request<T>(path: string, schema: ZodType<T>, method = 'GET', body?: object): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(baseUrl + path, {
      method, signal: controller.signal, cache: 'no-store',
      headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    })

    if ([502, 503, 504].includes(response.status)) throw new ApiError('SERVER_WAKING', response.status)
    if (response.status === 404) throw new ApiError('NOT_FOUND', 404)

    let data: unknown
    try {
      data = await response.json()
    } catch {
      if (controller.signal.aborted) throw new ApiError('SERVER_WAKING')
      throw new ApiError('INVALID_RESPONSE', response.status)
    }

    if (!response.ok) {
      const parsed = responses.error.safeParse(data)
      throw new ApiError(parsed.success ? parsed.data.error.code : 'INVALID_RESPONSE', response.status)
    }
    return validate(schema, data)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(controller.signal.aborted ? 'SERVER_WAKING' : 'NETWORK')
  } finally {
    clearTimeout(timeout)
  }
}
