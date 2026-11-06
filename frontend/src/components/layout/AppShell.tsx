import { matchPath, Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect, useRef, useState } from 'react'
import { DemoGuideContext } from './DemoCoach'
import { Footer } from './Footer'
import { TopNav } from './TopNav'
import { useRecall } from '../../hooks/useRecall'
import { Skeleton } from '../ui/Skeleton'

const guideKey = 'recallrelay:demo-guide'
const guideHidden = (search: string) => new URLSearchParams(search).get('demo') === '0'
const pageTitles = [
  ['/', 'Upload a notice'], ['/home', 'Supplier recalls'], ['/setup', 'Prepare demo orders'],
  ['/review/:recallId', 'Review the refund plan'], ['/result/:recallId', 'Refund result'],
]

function initialGuide(search: string) {
  if (guideHidden(search)) return false
  try { return localStorage.getItem(guideKey) !== 'off' } catch { return true }
}

export function AppShell() {
  const { latestResult } = useRecall()
  const { pathname, search } = useLocation()
  const [enabled, setEnabled] = useState(() => initialGuide(search))
  const main = useRef<HTMLElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const previous = useRef(pathname)

  useEffect(() => {
    if (guideHidden(search)) setEnabled(false)
  }, [search])

  useEffect(() => {
    const root = shell.current
    const header = root?.querySelector<HTMLElement>('.top-header')
    if (!root || !header || typeof ResizeObserver === 'undefined') return
    const syncHeight = () => root.style.setProperty('--nav-height', `${header.offsetHeight}px`)
    const observer = new ResizeObserver(syncHeight)
    observer.observe(header)
    syncHeight()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const title = pageTitles.find(([path]) => matchPath(path, pathname))?.[1] ?? 'Page not found'
    document.title = `${title} · RecallRelay`
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try { localStorage.setItem(guideKey, next ? 'on' : 'off') } catch { /* The guide still works for this visit. */ }
  }

  return (
    <DemoGuideContext.Provider value={{ enabled, toggle }}>
      <div className="app-shell" ref={shell}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <TopNav latestResult={latestResult} />
        <main ref={main} id="main-content" tabIndex={-1}>
          <div className="route-panel" key={pathname}>
            <Suspense fallback={<div className="container-shell page"><Skeleton label="Loading page…" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <Footer />
      </div>
    </DemoGuideContext.Provider>
  )
}
