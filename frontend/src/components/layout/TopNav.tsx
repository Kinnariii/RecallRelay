import { Link, NavLink } from 'react-router-dom'
import { ProgressTracker } from './ProgressTracker'
import { Button } from '../ui/Button'
import { useDemoGuide } from './DemoCoach'

export function TopNav({ latestResult }: { latestResult?: string | null }) {
  const guide = useDemoGuide()
  return (
    <header className="top-header">
      <div className="container-shell">
        <div className="nav-row">
          <Link to="/home" className="wordmark">
            <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
              <rect width="36" height="36" rx="10" fill="#003087" />
              <path d="M26 16a8 8 0 0 0-14-4l-3 3m0 0v-5m0 5h5m-4 5a8 8 0 0 0 14 4l3-3m0 0v5m0-5h-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            RecallRelay
          </Link>
          <nav className="nav-pills" aria-label="Main navigation">
            <NavLink to="/home">Home</NavLink>
            <NavLink to="/setup">Demo Setup</NavLink>
            <NavLink to="/" end>New Recall</NavLink>
            {latestResult ? <NavLink to={`/result/${encodeURIComponent(latestResult)}`}>Refund Result</NavLink> : <span aria-disabled="true">Refund Result</span>}
          </nav>
          <div className="nav-merchant">
            <Button id="demo-guide-toggle" className="guide-toggle" variant="ghost" aria-pressed={guide.enabled} onClick={guide.toggle}>Demo guide</Button>
            <span className="sandbox-tag"><span />SANDBOX MODE</span>
            <span className="avatar" title="Demo Merchant" aria-hidden="true">DM</span>
            <span className="merchant-name">Demo Merchant</span>
          </div>
        </div>
        <ProgressTracker />
      </div>
    </header>
  )
}
