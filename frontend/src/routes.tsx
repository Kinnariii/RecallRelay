import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'

const Home = lazy(() => import('./pages/Home').then(page => ({ default: page.Home })))
const Setup = lazy(() => import('./pages/Setup').then(page => ({ default: page.Setup })))
const Notice = lazy(() => import('./pages/Notice').then(page => ({ default: page.Notice })))
const Review = lazy(() => import('./pages/Review').then(page => ({ default: page.Review })))
const Result = lazy(() => import('./pages/Result').then(page => ({ default: page.Result })))
const NotFound = lazy(() => import('./pages/NotFound').then(page => ({ default: page.NotFound })))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Notice />} />
        <Route path="home" element={<Home />} />
        <Route path="setup" element={<Setup />} />
        <Route path="review" element={<Navigate to="/" replace />} />
        <Route path="review/:recallId" element={<Review />} />
        <Route path="result/:recallId" element={<Result />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
