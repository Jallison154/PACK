import { MobilePageShell } from '../components/layout/MobilePageShell'
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

export function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <MobilePageShell top={false} padded={false}>
      <Header title="Privacy Policy" showBack backTo="/settings/about" />

      <article className="page-px mx-auto max-w-lg space-y-8 pt-6">
        <p className="text-pack-text-muted text-sm">
          <span className="text-pack-text-secondary font-medium">Last Updated:</span> July 7, 2026
        </p>

        <Section title="Our Promise">
          <p>
            Pack was built around a simple idea:{' '}
            <strong className="text-pack-text font-medium">your relationships belong to you</strong>.
          </p>
          <p>
            We believe the information you store about the people in your life should remain under
            your control. Pack is designed to work offline first, gives you the ability to export
            your data, and only shares information with third-party services when you explicitly
            choose to enable those features.
          </p>
        </Section>

        <Section title="Overview">
          <p>
            Pack (&ldquo;the App&rdquo;) is developed by{' '}
            <strong className="text-pack-text font-medium">Okami Designs</strong>.
          </p>
          <p>This Privacy Policy explains how Pack collects, stores, and protects your information.</p>
        </Section>

        <Section title="Information You Store">
          <p>Pack may store information that you choose to enter, including:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Names</li>
            <li>Phone numbers</li>
            <li>Email addresses</li>
            <li>Companies</li>
            <li>Places</li>
            <li>Notes</li>
            <li>Interaction history</li>
            <li>Follow-up reminders</li>
            <li>Photos (if enabled)</li>
          </ul>
          <p>You remain the owner of all information you store within Pack.</p>
        </Section>

        <Section title="Location Data">
          <p>If you grant permission, Pack may access your device&apos;s location to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Suggest nearby saved Places</li>
            <li>Record where you met someone</li>
            <li>Improve the Last Seen feature</li>
          </ul>
          <p>
            Location information is used only for app functionality and is never shared without your
            permission.
          </p>
          <p>Location access can be disabled at any time through your device settings.</p>
        </Section>

        <Section title="Local Storage">
          <p>Pack stores your information locally on your device for speed and offline use.</p>
          <p>
            If you do not create an account, your Pack data stays on your device only and is not
            uploaded to Okami Designs servers.
          </p>
        </Section>

        <Section title="Accounts and Cloud Sync">
          <p>
            If you choose to create a Pack account, your Pack data may be stored on secure cloud
            infrastructure (Supabase PostgreSQL) so you can access the same Pack on multiple devices.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Account sign-up uses your email address</li>
            <li>Passwords are managed by our authentication provider and are never stored in plain text by Pack</li>
            <li>Each account can only access its own Pack data</li>
            <li>You can export your data or delete your account from Settings → Account</li>
          </ul>
          <p>
            Creating an account is <strong className="text-pack-text font-medium">optional</strong>.
            You may continue using Pack locally without an account.
          </p>
        </Section>

        <Section title="Backups">
          <p>Pack allows you to export or back up your information.</p>
          <p>
            You are responsible for maintaining any backup files you create or store using
            third-party services.
          </p>
        </Section>

        <Section title="Analytics">
          <p>Analytics are optional.</p>
          <p>
            If enabled, anonymous usage information may be collected to help improve Pack.
          </p>
          <p>
            Analytics never include your contacts, notes, or personal relationship data.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>Future versions of Pack may integrate with services such as:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Mapping providers</li>
            <li>Cloud storage</li>
            <li>Authentication providers</li>
          </ul>
          <p>These services operate under their own privacy policies.</p>
        </Section>

        <Section title="Security">
          <p>Reasonable measures are taken to protect your information.</p>
          <p>However, no software or storage system can guarantee absolute security.</p>
          <p>We recommend enabling:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Device passcode</li>
            <li>Face ID</li>
            <li>Fingerprint authentication</li>
          </ul>
        </Section>

        <Section title="Children's Privacy">
          <p>Pack is not intended for children under 13 years of age.</p>
        </Section>

        <Section title="Your Rights">
          <p>You may:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Export your data</li>
            <li>Delete your data</li>
            <li>Disable analytics</li>
            <li>Disable location services</li>
            <li>Remove backups</li>
          </ul>
        </Section>

        <Section title="Changes">
          <p>This Privacy Policy may be updated from time to time.</p>
          <p>The &ldquo;Last Updated&rdquo; date will always reflect the latest version.</p>
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
    </MobilePageShell>
  )
}
