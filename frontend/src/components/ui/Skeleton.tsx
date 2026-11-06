export function Skeleton({ rows = 3, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="skeleton">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => <div key={index} aria-hidden="true" />)}
    </div>
  )
}
