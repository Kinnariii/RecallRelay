import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, onClose, children, busy = false, drawer = false }: {
  title: string; onClose: () => void; children: ReactNode; busy?: boolean; drawer?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement as HTMLElement | null
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = originalOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={id} aria-modal="true" className={drawer ? 'modal drawer' : 'modal'}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        const first = items.at(0)
        const last = items.at(-1)
        if (!first || !last) { event.preventDefault(); return }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}>
      <div className="modal-header">
        <h2 className="heading-md" id={id}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><Icon name="close" /></button>
      </div>
      {children}
    </dialog>
  )
}
