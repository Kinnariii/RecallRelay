import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { usePolling } from '../hooks/usePolling'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { ProgressBar } from '../components/ui/ProgressBar'

export function ServerWaking({ onReady }: { onReady?: () => void }) {
  const [state, setState] = useState<'waiting' | 'checking' | 'ready'>('waiting')
  const busy = useRef(false)
  const current = useRef(onReady)
  useEffect(() => { current.current = onReady }, [onReady])

  const check = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setState('checking')
    try {
      await api.health()
      setState('ready')
      current.current?.()
    } catch {
      setState('waiting')
    } finally {
      busy.current = false
    }
  }, [])
  usePolling(state !== 'ready', check)

  return (
    <Card className="waking-state" aria-live="polite">
      <span className="icon-tile"><Icon name={state === 'ready' ? 'check_circle' : 'cloud_sync'} /></span>
      <div className="stack">
        <h2 className="heading-md">{state === 'ready' ? 'Sandbox connected' : 'Reconnecting to the sandbox…'}</h2>
        <p className="muted">{state === 'ready' ? 'Try the action again.' : 'We’ll check the connection again in a moment.'}</p>
        {state !== 'ready' && <ProgressBar label={state === 'checking' ? 'Checking sandbox connection' : 'Waiting to check sandbox connection'} />}
        {state !== 'ready' && <Button variant="secondary" icon="refresh" busy={state === 'checking'} onClick={() => void check()}>Check connection now</Button>}
      </div>
    </Card>
  )
}
