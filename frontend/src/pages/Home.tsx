import { ButtonLink } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

const steps = [
  { icon: 'upload_file', title: 'Upload notice', detail: 'Paste a supplier notice, upload a text file, or use a sample.' },
  { icon: 'auto_awesome', title: 'Check the product and lots', detail: 'AI shows the quotes it used from the notice.' },
  { icon: 'inventory_2', title: 'Review the orders', detail: 'See what to refund and which orders need a closer look.' },
  { icon: 'payments', title: 'Approve and refund', detail: 'Confirm the exact total, then track the sandbox refund status.' },
]
const trust = [
  { icon: 'receipt_long', title: 'Refund only affected items', detail: 'Keep the rest of the original order as it is.', tone: 'confirmed' },
  { icon: 'shield', title: 'One refund per order for a recall', detail: 'Approving the same recall again returns the existing refund.', tone: 'pending' },
  { icon: 'manage_search', title: 'Leave uncertain orders for review', detail: 'Missing or unclear lots stay out of automatic refunds.', tone: 'uncertain' },
]

function RefundIllustration() {
  return (
    <div className="home-illustration">
      <Card className="illustration-card">
        <div className="row between">
          <div className="card-title"><span className="icon-tile"><Icon name="receipt_long" /></span><div><p className="eyebrow">Refund preview</p><h2 className="heading-sm">Affected order</h2></div></div>
          <Badge tone="pending" icon="info">Example</Badge>
        </div>
        <div className="illustration-body">
          <div className="illustration-line"><Icon name="inventory_2" /><span>Affected item</span><Badge tone="confirmed" icon="check_circle">Refunded</Badge></div>
          <div className="illustration-line"><Icon name="shopping_basket" /><span>Other items</span><Badge tone="unaffected" icon="remove_circle_outline">Kept</Badge></div>
          <div className="illustration-line illustration-total"><Icon name="payments" /><strong>Partial refund</strong><Icon name="verified" /></div>
        </div>
        <div className="row illustration-note"><Icon name="shield" /> Sandbox refund preview</div>
      </Card>
    </div>
  )
}

export function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="container-shell home-hero-grid">
          <div className="home-hero-copy">
            <span className="home-kicker"><Icon name="shield" /> Product recalls for small retailers</span>
            <h1>Refund the right customers. The right amount.</h1>
            <p>Start with a supplier recall notice. See which orders are affected, then approve refunds for those items.</p>
            <div className="row">
              <ButtonLink to="/setup" icon="arrow_forward">Start guided demo</ButtonLink>
              <ButtonLink to="/" variant="secondary" icon="description">Upload a notice</ButtonLink>
            </div>
          </div>
          <RefundIllustration />
        </div>
      </section>
      <section className="home-how">
        <div className="container-shell">
          <p className="eyebrow">From notice to refund</p>
          <h2 className="heading-lg">How it works</h2>
          <div className="home-how-grid">
            {steps.map(({ icon, title, detail }, index) => <Card key={title}>
              <div className="row between"><span className="icon-tile"><Icon name={icon} /></span><span className="eyebrow">Step 0{index + 1}</span></div>
              <h3 className="heading-sm">{title}</h3><p className="muted text-sm">{detail}</p>
            </Card>)}
          </div>
        </div>
      </section>
      <section className="container-shell home-trust">
        <p className="eyebrow">Built for small retailers</p>
        <h2 className="heading-lg">Keep control of every refund</h2>
        <div className="home-trust-grid">
          {trust.map(({ icon, title, detail, tone }) => <Card key={title}>
            <span className={`icon-tile tone-${tone}`}><Icon name={icon} /></span>
            <h3 className="heading-sm">{title}</h3><p className="muted text-sm">{detail}</p>
          </Card>)}
        </div>
      </section>
      <section className="home-cta">
        <div className="container-shell"><div className="home-cta-panel">
          <div><h2>Try a recall with demo orders</h2><p>See one partial refund and two orders that stay untouched.</p></div>
          <ButtonLink to="/setup" variant="secondary" icon="arrow_forward">Open demo setup</ButtonLink>
        </div></div>
      </section>
    </>
  )
}
