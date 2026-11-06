import type { ErrorRequestHandler } from 'express'
import { z } from 'zod'

export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(resource: 'Recall' | 'Order' | 'Refund' | 'Endpoint') {
  return new AppError(404, 'NOT_FOUND', `${resource} could not be found.`)
}

export function readInput<T>(schema: z.ZodType<T>, value: unknown, message = 'Check the request fields and try again.'): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new AppError(400, 'INVALID_INPUT', message)
  return result.data
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  const bodyError = z.object({ type: z.string() }).safeParse(error)
  const type = bodyError.success ? bodyError.data.type : null
  const safe = error instanceof AppError ? error
    : type === 'entity.too.large' ? new AppError(413, 'BODY_TOO_LARGE', 'The request body is too large.')
    : type === 'entity.parse.failed' || error instanceof URIError ? new AppError(400, 'INVALID_INPUT', 'The request could not be read.')
    : type === 'encoding.unsupported' || type === 'charset.unsupported' ? new AppError(415, 'INVALID_INPUT', 'Use UTF-8 JSON for request data.')
    : new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
  // Keep the internal AI failure distinct while preserving the shipped frontend’s error contract.
  const extractionFailure = safe.code === 'AI_EXTRACTION_FAILED'
  res.status(extractionFailure ? 422 : safe.status).json({
    error: { code: extractionFailure ? 'EXTRACTION_FAILED' : safe.code, message: safe.message },
  })
}
