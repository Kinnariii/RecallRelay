const layouts = {
  page: ['heading', 'panel', 'panel'],
  orders: ['order', 'order'],
  fields: ['heading', 'field', 'field', 'field'],
  review: ['hero', 'order'],
  refunds: ['hero', 'table'],
} as const

export function Skeleton({ label = 'Loading…', variant = 'page' }: {
  label?: string; variant?: keyof typeof layouts
}) {
  return (
    <div role="status" className={`skeleton skeleton--${variant}`}>
      <span className="sr-only">{label}</span>
      {layouts[variant].map((block, index) => <div key={index} className={`skeleton-block skeleton-block--${block}`} aria-hidden="true">
        {(block === 'order' || block === 'table' || block === 'hero') && <><span /><span /></>}
      </div>)}
    </div>
  )
}
