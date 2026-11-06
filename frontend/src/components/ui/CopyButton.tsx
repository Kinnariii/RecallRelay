import { Icon } from './Icon'
import { useToast } from './ToastProvider'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast()
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast(`${label} copied.`, 'success')
    } catch {
      toast('Copy is unavailable. Select the ID to copy it manually.', 'warning')
    }
  }
  return <button type="button" className="icon-button copy-button" title={`Copy ${label}`} aria-label={`Copy ${label}`} onClick={() => void copy()}><Icon name="content_copy" /></button>
}
