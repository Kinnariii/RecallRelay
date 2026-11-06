import { isWaking } from '../../api/client'
import { ServerWaking } from '../../pages/ServerWaking'
import { ErrorState } from './ErrorState'

export function AsyncFailure({ error, retry, onReady }: { error: unknown; retry?: () => void; onReady?: () => void }) {
  return isWaking(error) ? <ServerWaking onReady={onReady ?? retry} /> : <ErrorState error={error} retry={retry} />
}
