import { createContext, useContext } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export const DemoGuideContext = createContext({ enabled: false, toggle: () => {} })
export const useDemoGuide = () => useContext(DemoGuideContext)

export function DemoCoach({ hint, action, targets }: { hint: string; action: string; targets: string[] }) {
  const { enabled, toggle } = useDemoGuide()
  if (!enabled) return null

  function revealAction() {
    for (const id of targets) {
      const element = document.getElementById(id)
      if (!element || element.matches(':disabled,[aria-disabled="true"]')) continue
      element.focus({ preventScroll: true })
      element.scrollIntoView({ block: 'center' })
      break
    }
  }

  return (
    <aside className="demo-coach" aria-label="Demo guide">
      <div className="row between">
        <p className="eyebrow"><Icon name="lightbulb" /> Demo guide</p>
        <button type="button" className="icon-button" aria-label="Hide demo guide" onClick={() => {
          toggle()
          document.getElementById('demo-guide-toggle')?.focus()
        }}><Icon name="close" /></button>
      </div>
      <p>{hint}</p>
      <Button variant="secondary" icon="arrow_forward" disabled={!targets.length} onClick={revealAction}>{action}</Button>
    </aside>
  )
}
