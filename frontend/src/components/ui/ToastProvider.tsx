import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastTone } from './Toast'

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems(current => current.filter(item => item.id !== id))
  }, [])
  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++
    const oldest = timers.current.keys().next().value
    if (timers.current.size === 3 && oldest !== undefined) dismiss(oldest)
    setItems(current => [...current, { id, message, tone }])
    timers.current.set(id, setTimeout(() => dismiss(id), 5000))
  }, [dismiss])

  useEffect(() => {
    const activeTimers = timers.current
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return
      const latest = [...activeTimers.keys()].at(-1)
      if (latest !== undefined) dismiss(latest)
    }
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('keydown', escape)
      activeTimers.forEach(timer => clearTimeout(timer))
      activeTimers.clear()
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {items.map(item => <Toast key={item.id} item={item} dismiss={() => dismiss(item.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
