import type { RequestHandler } from 'express'
import { AppError } from './errors.js'

export function requestLog(log: (message: string) => void): RequestHandler {
  return (req, res, next) => {
    const started = performance.now()
    res.once('finish', () => {
      const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched'
      log(`[http] ${req.method} ${route} ${res.statusCode} ${Math.round(performance.now() - started)}ms`)
    })
    next()
  }
}

export function checkMutation(frontendOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (req.method === 'POST' || req.method === 'PATCH') {
      const origin = req.get('Origin')
      if (origin && origin !== frontendOrigin) {
        throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This origin cannot submit changes.')
      }
      const hasBody = Number(req.get('Content-Length') ?? 0) > 0 || req.get('Transfer-Encoding')
      if (hasBody && !req.is('application/json')) {
        throw new AppError(415, 'INVALID_INPUT', 'Send the request as JSON.')
      }
    }
    next()
  }
}

export function rateLimit(limit: number): RequestHandler {
  const minute = 60_000
  const windows = new Map<string, { count: number; ends: number }>()
  let nextSweep = 0
  return (req, res, next) => {
    const now = Date.now()
    if (now >= nextSweep) {
      for (const [key, entry] of windows) {
        if (entry.ends <= now) windows.delete(key)
      }
      nextSweep = now + minute
    }
    const key = req.ip ?? 'unknown'
    let window = windows.get(key)
    if (!window || window.ends <= now) {
      window = { count: 0, ends: now + minute }
      if (windows.size < 4096 || windows.has(key)) windows.set(key, window)
      else window.count = limit
    }
    if (window.count >= limit) {
      res.set('Retry-After', String(Math.ceil((window.ends - now) / 1000)))
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Wait a moment and try again.')
    }
    window.count++
    next()
  }
}
