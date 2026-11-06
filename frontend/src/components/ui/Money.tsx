import { formatCents } from '../../lib/money'

export function Money({ cents, of, tone = 'default', className = '' }: {
  cents: number; of?: number; tone?: 'default' | 'refund' | 'retained'; className?: string
}) {
  const value = of === undefined ? formatCents(cents) : `${formatCents(cents)} of ${formatCents(of)}`
  return <span className={`money money--${tone} ${className}`}>{value}</span>
}
