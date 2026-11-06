import type { ReactNode, Ref } from 'react'

export function SectionHeader({ eyebrow, title, description, headingRef }: {
  eyebrow?: string; title: ReactNode; description?: ReactNode; headingRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <header className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="heading-lg" ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h1>
      {description && <p className="muted">{description}</p>}
    </header>
  )
}
