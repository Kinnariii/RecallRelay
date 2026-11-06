import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

type Style = { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string }
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Style & { busy?: boolean }

export function Button({ variant = 'primary', icon, busy, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`button button--${variant} ${className}`}>
      {(busy || icon) && <Icon name={busy ? 'progress_activity' : icon!} className={busy ? 'spin' : ''} />}
      {children}
    </button>
  )
}

export function ButtonLink({ to, children, variant = 'primary', icon }: Style & { to: string; children: ReactNode }) {
  return <Link to={to} className={`button button--${variant}`}>{icon && <Icon name={icon} />}{children}</Link>
}
