import { AppRoutes } from './routes'
import { RecallProvider } from './components/layout/RecallProvider'
import { ToastProvider } from './components/ui/ToastProvider'

export function App() {
  return <RecallProvider><ToastProvider><AppRoutes /></ToastProvider></RecallProvider>
}
