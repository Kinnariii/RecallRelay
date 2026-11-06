import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon } from './Icon'

type Style = { variant?: 'primary' | 'secondary' | 'ghost' | 'danger-safe'; icon?: string }
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Style & { busy?: boolean }

export function Button({ variant = 'primary', icon, busy, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`button button--${variant} ${className}`}>
      {(busy || icon) && <Icon name={busy ? 'progress_activity' : icon!} className={busy ? 'spin' : ''} />}
      {children}
    </button>
  )
}

export function ButtonLink({ children, variant = 'primary', icon, className = '', ...props }: Style & LinkProps) {
  return <Link {...props} className={`button button--${variant} ${className}`}>{icon && <Icon name={icon} />}{children}</Link>
}
