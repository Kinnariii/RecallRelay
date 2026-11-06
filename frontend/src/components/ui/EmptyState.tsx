import type { ReactNode } from 'react'
import { Card } from './Card'
import { Icon } from './Icon'

export function EmptyState({ title, description, action, icon = 'inbox' }: {
  title: string; description: string; action?: ReactNode; icon?: string
}) {
  return (
    <Card className="empty-state">
      <span className="icon-tile"><Icon name={icon} /></span>
      <h2 className="heading-md">{title}</h2>
      <p className="muted">{description}</p>
      {action}
    </Card>
  )
}
