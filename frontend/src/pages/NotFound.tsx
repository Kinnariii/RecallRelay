import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SectionHeader } from '../components/ui/SectionHeader'

export function NotFound() {
  return (
    <section className="container-shell page not-found">
      <SectionHeader title="Page not found" />
      <EmptyState title="Continue with a recall" icon="search_off"
        description="Prepare demo orders or upload a supplier notice."
        action={<div className="row justify-center"><ButtonLink to="/setup" variant="secondary">Prepare demo orders</ButtonLink><ButtonLink to="/">Upload a notice</ButtonLink></div>} />
    </section>
  )
}
