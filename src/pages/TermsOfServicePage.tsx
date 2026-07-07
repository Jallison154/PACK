import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-pack-text text-base font-semibold tracking-tight">{title}</h2>
      <div className="text-pack-text-secondary space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

export function TermsOfServicePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh pb-12">
      <Header title="Terms of Service" showBack backTo="/settings/about" />

      <article className="page-px mx-auto max-w-lg space-y-8 pt-6">
        <p className="text-pack-text-muted text-sm">
          <span className="text-pack-text-secondary font-medium">Last Updated:</span> July 7, 2026
        </p>

        <Section title="Acceptance">
          <p>
            By downloading, installing, or using Pack, you agree to these Terms of Service.
          </p>
          <p>If you do not agree, please discontinue use of the application.</p>
        </Section>

        <Section title="Purpose">
          <p>
            Pack is designed to help users organize and remember personal and professional
            relationships.
          </p>
        </Section>

        <Section title="Your Data">
          <p>You retain ownership of all information you enter into Pack.</p>
          <p>This includes:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Contacts</li>
            <li>Notes</li>
            <li>Places</li>
            <li>Companies</li>
            <li>Photos</li>
            <li>Follow-up reminders</li>
            <li>Interaction history</li>
          </ul>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to use Pack to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Break any laws</li>
            <li>Harass or impersonate others</li>
            <li>Store illegal material</li>
            <li>Infringe intellectual property</li>
            <li>Attempt unauthorized access to systems</li>
          </ul>
        </Section>

        <Section title="Data Responsibility">
          <p>
            Although Pack includes backup features, you are responsible for maintaining your own
            backups.
          </p>
          <p>
            Okami Designs is not responsible for lost, corrupted, or accidentally deleted
            information.
          </p>
        </Section>

        <Section title="Availability">
          <p>Pack may evolve over time.</p>
          <p>Features may be added, changed, or removed without prior notice.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>Some features may rely on third-party providers.</p>
          <p>
            Okami Designs is not responsible for interruptions or issues caused by those services.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>Pack is provided &ldquo;AS IS&rdquo; without warranties of any kind.</p>
          <p>Use of the application is at your own risk.</p>
        </Section>

        <Section title="Limitation of Liability">
          <p>To the fullest extent permitted by law, Okami Designs shall not be liable for:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Lost data</li>
            <li>Lost profits</li>
            <li>Business interruption</li>
            <li>Indirect or consequential damages</li>
          </ul>
        </Section>

        <Section title="Termination">
          <p>You may stop using Pack at any time.</p>
          <p>
            Okami Designs reserves the right to suspend or terminate access for users who violate
            these Terms.
          </p>
        </Section>

        <Section title="Changes">
          <p>These Terms may be updated periodically.</p>
          <p>Continued use of Pack after updates constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="Governing Law">
          <p>
            These Terms shall be governed by the laws of the State of Montana, United States.
          </p>
        </Section>

        <Section title="Contact">
          <p className="font-medium text-pack-text">Okami Designs</p>
          <p>
            Website:{' '}
            <a
              href="https://okamidesigns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pack-text hover:text-pack-accent transition-colors"
            >
              okamidesigns.com
            </a>
          </p>
          <p>
            Email:{' '}
            <a
              href="mailto:contact@okamidesigns.com"
              className="text-pack-text hover:text-pack-accent transition-colors"
            >
              contact@okamidesigns.com
            </a>
          </p>
        </Section>

        <button
          type="button"
          onClick={() => navigate('/settings/about')}
          className="text-pack-text-muted hover:text-pack-text-secondary pt-2 text-sm transition-colors"
        >
          Back to Settings
        </button>
      </article>
    </div>
  )
}
