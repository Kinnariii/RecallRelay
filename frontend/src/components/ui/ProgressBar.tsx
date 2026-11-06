export function ProgressBar({ value, label }: { value?: number; label: string }) {
  return <progress className="progress-bar" aria-label={label} max={100} value={value === undefined ? undefined : Math.min(100, Math.max(0, value))} />
}
