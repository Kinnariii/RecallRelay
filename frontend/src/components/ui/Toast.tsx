import { Icon } from './Icon'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'
export type ToastItem = { id: number; message: string; tone: ToastTone }
const appearance = {
  success: ['confirmed', 'check_circle'], info: ['pending', 'info'],
  warning: ['uncertain', 'warning'], error: ['failed', 'error'],
}

export function Toast({ item, dismiss }: { item: ToastItem; dismiss: () => void }) {
  const [tone, icon] = appearance[item.tone]
  return (
    <div className={`toast tone-${tone}`}>
      <Icon name={icon} /><span>{item.message}</span>
      <button type="button" aria-label="Dismiss notification" className="icon-button" onClick={dismiss}><Icon name="close" /></button>
    </div>
  )
}
