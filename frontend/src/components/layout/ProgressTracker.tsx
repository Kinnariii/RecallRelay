import { matchPath, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'

const steps = [
  { path: '/setup', label: 'Setup orders' },
  { path: '/', label: 'Upload notice' },
  { path: '/review/:recallId', label: 'Review plan' },
  { path: '/result/:recallId', label: 'Refund result' },
]

export function ProgressTracker() {
  const { pathname } = useLocation()
  const current = steps.findIndex(step => matchPath(step.path, pathname))
  if (current < 0) return null

  return (
    <ol className="tracker" aria-label="Recall progress">
      {steps.map(({ label }, index) => (
        <li key={label} className="tracker-step">
          <span className="step-pill" aria-current={index === current ? 'step' : undefined}>
            <Icon name={index < current ? 'check_circle' : index === current ? 'radio_button_checked' : 'radio_button_unchecked'} />
            <span>{index + 1}. {label}</span>
            {index < current && <span className="sr-only"> (complete)</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
