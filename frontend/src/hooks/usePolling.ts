import { useEffect } from 'react'

export function usePolling(active: boolean, poll: () => void | Promise<unknown>, delay = 3000) {
  useEffect(() => {
    if (!active) return
    let running = false
    const timer = window.setInterval(async () => {
      if (running) return
      running = true
      try { await poll() } finally { running = false }
    }, delay)
    return () => window.clearInterval(timer)
  }, [active, delay, poll])
}
