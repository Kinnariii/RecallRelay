import { ApiError, friendlyError } from '../../api/client'
import { Button, ButtonLink } from './Button'
import { EmptyState } from './EmptyState'

export function ErrorState({ error, retry, title = 'We couldn’t load this screen' }: { error: unknown; retry?: () => void; title?: string }) {
  const missing = error instanceof ApiError && error.code === 'NOT_FOUND'
  return (
    <div role="alert">
      <EmptyState icon={missing ? 'search_off' : 'error'} title={missing ? 'Recall or order not found' : title}
        description={friendlyError(error)}
        action={missing ? <ButtonLink to="/">Back to notice upload</ButtonLink> : retry && <Button onClick={retry} icon="refresh">Try again</Button>} />
    </div>
  )
}
