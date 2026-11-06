import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export function NotFound() {
  return (
    <section className="container-shell page not-found">
      <header className="page-header"><p className="eyebrow">404</p><h1 className="heading-lg">Page not found</h1></header>
      <EmptyState title="This page isn’t available" icon="search_off"
        description="Return to the recall workflow to prepare orders or upload a notice."
        action={<div className="row justify-center"><ButtonLink to="/setup" variant="secondary">Demo setup</ButtonLink><ButtonLink to="/">Upload notice</ButtonLink></div>} />
    </section>
  )
}
