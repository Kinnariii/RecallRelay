import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Badge({ tone = 'unaffected', icon, children }: { tone?: string; icon?: string; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{icon && <Icon name={icon} />}<span>{children}</span></span>
}
