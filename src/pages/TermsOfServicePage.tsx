import { Link, useNavigate } from 'react-router-dom'
import { PackLogo } from '../components/brand/PackLogo'
import { Header } from '../components/layout/Header'
import { MobilePageShell } from '../components/layout/MobilePageShell'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-pack-text text-base font-semibold tracking-tight">{title}</h2>
      <div className="text-pack-text-secondary space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

export function TermsOfServicePage({ publicMode = false }: { publicMode?: boolean }) {
  const navigate = useNavigate()

  const body = (
    <article className="page-px mx-auto max-w-lg space-y-8 pt-4">
      <p className="text-pack-text-muted text-sm">
        <span className="text-pack-text-secondary font-medium">Last Updated:</span> July 7, 2026
      </p>

      <Section title="Acceptance">
        <p>By downloading, installing, or using Pack, you agree to these Terms of Service.</p>
        <p>If you do not agree, please discontinue use of the application.</p>
      </Section>

      <Section title="Description of Service">
        <p>
          Pack is a personal relationship memory application developed by{' '}
          <strong className="text-pack-text font-medium">Okami Designs</strong>.
        </p>
        <p>
          Pack helps you remember people, places, and the context behind your connections. Features
          may change over time as the product evolves.
        </p>
      </Section>

      <Section title="Your Account">
        <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
        <p>You are responsible for all activity that occurs under your account.</p>
      </Section>

      <Section title="Your Data">
        <p>You retain ownership of the information you store in Pack.</p>
        <p>
          Okami Designs does not claim ownership of your contacts, notes, or personal relationship
          data.
        </p>
      </Section>

      <Section title="Acceptable Use">
        <p>You agree not to misuse Pack, including attempting to access another user&apos;s data.</p>
      </Section>

      <Section title="Disclaimer">
        <p>Pack is provided &ldquo;as is&rdquo; without warranties of any kind.</p>
        <p>
          Okami Designs is not responsible for lost, corrupted, or accidentally deleted information.
        </p>
      </Section>

      <Section title="Contact">
        <p className="font-medium text-pack-text">Okami Designs</p>
        <p>
          <a
            href="mailto:contact@okamidesigns.com"
            className="text-pack-text hover:text-pack-accent transition-colors"
          >
            contact@okamidesigns.com
          </a>
        </p>
      </Section>
    </article>
  )

  if (publicMode) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] pb-12">
        <header className="page-nav-top page-px flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <PackLogo size="sm" />
          </Link>
        </header>
        {body}
        <div className="page-px mx-auto max-w-lg">
          <Link to="/" className="text-pack-text-muted hover:text-pack-text-secondary text-sm">
            Back to Pack
          </Link>
        </div>
      </div>
    )
  }

  return (
    <MobilePageShell top={false} padded={false}>
      <Header title="Terms of Service" showBack backTo="/settings/about" />
      <div className="pt-2">{body}</div>
      <div className="page-px mx-auto max-w-lg pb-8">
        <button
          type="button"
          onClick={() => navigate('/settings/about')}
          className="text-pack-text-muted hover:text-pack-text-secondary text-sm transition-colors"
        >
          Back to Settings
        </button>
      </div>
    </MobilePageShell>
  )
}
