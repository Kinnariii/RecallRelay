import { status } from '../../lib/status'
import { Badge } from './Badge'

export function StatusBadge({ value }: { value: keyof typeof status }) {
  const { tone, icon, label } = status[value]
  return <Badge tone={tone} icon={icon}>{label}</Badge>
}
