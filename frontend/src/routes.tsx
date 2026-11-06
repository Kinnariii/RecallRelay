import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { Notice } from './pages/Notice'
import { Review } from './pages/Review'
import { Result } from './pages/Result'
import { NotFound } from './pages/NotFound'

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
