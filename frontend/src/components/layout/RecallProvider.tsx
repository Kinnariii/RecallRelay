import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { RecallContext, type RecallEventKind } from '../../hooks/useRecall'

const key = `recallrelay:session:v1:${import.meta.env.VITE_USE_MOCK === 'false' ? import.meta.env.VITE_API_URL || 'real' : 'mock'}`
const sessionSchema = z.object({
  latestResult: z.string().nullable(),
  events: z.record(z.string(), z.array(z.object({
    kind: z.enum(['upload', 'extract', 'edit', 'plan', 'approve']),
    detail: z.string(), at: z.iso.datetime(),
  }))),
})

function initialSession(): z.infer<typeof sessionSchema> {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'))
    if (parsed.success) return parsed.data
  } catch {
    // The API remains authoritative if the browser cache is unavailable.
  }
  return { latestResult: null, events: {} }
}

export function RecallProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(initialSession)
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(session)) } catch { /* browser cache is optional */ }
  }, [session])
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key) setSession(initialSession()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const record = useCallback((id: string, kind: RecallEventKind, detail: string, at = new Date().toISOString()) => {
    setSession(current => {
      const prior = Object.hasOwn(current.events, id) ? current.events[id] : []
      if (kind !== 'edit' && prior.some(event => event.kind === kind)) return current
      return { ...current, events: { ...current.events, [id]: [...prior, { kind, detail, at }] } }
    })
  }, [])
  const setLatest = useCallback((id: string) => {
    setSession(current => current.latestResult === id ? current : { ...current, latestResult: id })
  }, [])
  const clear = useCallback(() => setSession({ latestResult: null, events: {} }), [])
  return <RecallContext.Provider value={{ ...session, record, setLatest, clear }}>{children}</RecallContext.Provider>
}
