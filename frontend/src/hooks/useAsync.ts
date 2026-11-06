import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsync<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const sequence = useRef(0)

  const reload = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true)
    setError(null)
    try {
      const next = await load()
      if (request === sequence.current) setData(next)
      return next
    } catch (reason) {
      if (request === sequence.current) setError(reason)
    } finally {
      if (request === sequence.current) setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void reload()
    return () => { sequence.current++ }
  }, [reload])

  const replace = useCallback((next: T) => {
    sequence.current++
    setData(next)
    setLoading(false)
    setError(null)
  }, [])

  return { data, error, loading, reload, replace }
}
