import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastTone } from './Toast'

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null)
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setItem(null)
  }, [])
  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    clearTimeout(timer.current)
    setItem({ id: nextId.current++, message, tone })
    timer.current = setTimeout(dismiss, 5000)
  }, [dismiss])

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) dismiss()
    }
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('keydown', escape)
      clearTimeout(timer.current)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
        {item && <Toast key={item.id} item={item} dismiss={dismiss} />}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
