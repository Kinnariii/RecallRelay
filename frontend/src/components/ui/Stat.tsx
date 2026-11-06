import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Stat({ label, icon, children, className = '' }: {
  label: string; icon?: string; children: ReactNode; className?: string
}) {
  return <div className={`stat ${className}`}>
    <dt>{icon && <Icon name={icon} />}{label}</dt><dd>{children}</dd>
  </div>
}
