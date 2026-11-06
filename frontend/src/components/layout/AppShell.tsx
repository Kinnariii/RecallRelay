import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Footer } from './Footer'
import { TopNav } from './TopNav'
import { useRecall } from '../../hooks/useRecall'

export function AppShell() {
  const { latestResult } = useRecall()
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <TopNav latestResult={latestResult} />
      <main ref={main} id="main-content" tabIndex={-1}><Outlet /></main>
      <Footer />
    </div>
  )
}
