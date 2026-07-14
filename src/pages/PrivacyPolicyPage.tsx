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

export function PrivacyPolicyPage({ publicMode = false }: { publicMode?: boolean }) {
  const navigate = useNavigate()

  if (publicMode) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)]">
        <header className="page-nav-top page-px flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <PackLogo size="sm" />
          </Link>
        </header>
        <article className="page-px mx-auto max-w-lg space-y-8 pb-12 pt-4">
          {policyContent}
          <Link to="/" className="text-pack-text-muted hover:text-pack-text-secondary text-sm">
            Back to Pack
          </Link>
        </article>
      </div>
    )
  }

  return (
    <MobilePageShell top={false} padded={false}>
      <Header title="Privacy Policy" showBack backTo="/settings/about" />

      <article className="page-px mx-auto max-w-lg space-y-8 pt-6">
        {policyContent}
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

const policyContent = (
  <>
    <p className="text-pack-text-muted text-sm">
      <span className="text-pack-text-secondary font-medium">Last Updated:</span> July 14, 2026
    </p>

    <Section title="Our Promise">
      <p>
        Pack was built around a simple idea:{' '}
        <strong className="text-pack-text font-medium">your relationships belong to you</strong>.
      </p>
      <p>
        The information you store about the people in your life should stay under your control. Pack
        keeps a local copy on your device for speed and offline use, syncs to your account when you
        are signed in, and lets you export or delete that data from Settings.
      </p>
    </Section>

    <Section title="Overview">
      <p>
        Pack (&ldquo;the App&rdquo;) is developed by{' '}
        <strong className="text-pack-text font-medium">Okami Designs</strong>.
      </p>
      <p>This Privacy Policy explains how Pack collects, stores, and protects your information.</p>
    </Section>

    <Section title="Accounts">
      <p>
        Pack requires an account to use the App. Sign-in uses your email address through our
        authentication provider (Supabase Auth). Passwords are managed by that provider and are
        never stored in plain text by Pack.
      </p>
      <p>Each account can only access its own Pack data.</p>
    </Section>

    <Section title="Information You Store">
      <p>Pack may store information that you choose to enter, including:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Names and profile details</li>
        <li>Phone numbers and email addresses</li>
        <li>Companies and job titles</li>
        <li>Places and map-related place metadata</li>
        <li>Notes and tags</li>
        <li>Interaction history and follow-up dates</li>
        <li>Where you met someone and last-seen context</li>
      </ul>
      <p>You remain the owner of all information you store within Pack.</p>
    </Section>

    <Section title="Location Data">
      <p>If you grant permission, Pack may access your device&apos;s location to:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Suggest nearby places of interest</li>
        <li>Help you record where you met someone</li>
        <li>Show your position on the Places map</li>
      </ul>
      <p>
        Location is used for app features only. You can revoke location access at any time in your
        device settings.
      </p>
    </Section>

    <Section title="How Pack Stores Data">
      <p>
        Pack keeps a local database on your device (SQLite) so the App stays fast and works when
        you are offline.
      </p>
      <p>
        When you are signed in, Pack Sync may store the same Pack data on secure cloud
        infrastructure (Supabase PostgreSQL) so you can use Pack across devices.
      </p>
      <p>
        You can turn Pack Sync off from Settings → Account. Local changes may still be saved on
        this device until sync is enabled again.
      </p>
    </Section>

    <Section title="Maps and Place Search">
      <p>
        Pack uses Mapbox for maps and place search. When you search for places or load the map,
        Mapbox may receive location or search queries needed to provide those features. Mapbox
        operates under its own privacy policy.
      </p>
    </Section>

    <Section title="Backups and Export">
      <p>
        Pack lets you export your information (including CSV, JSON, and SQLite backups) from
        Settings → Data &amp; Backup.
      </p>
      <p>
        You are responsible for any backup files you download or store outside Pack.
      </p>
    </Section>

    <Section title="Security">
      <p>Reasonable measures are taken to protect your information.</p>
      <p>No software or storage system can guarantee absolute security.</p>
      <p>
        Pack offers an optional passcode lock in Settings → Privacy &amp; Security. We also
        recommend using your device passcode or biometric lock at the system level.
      </p>
    </Section>

    <Section title="Children&apos;s Privacy">
      <p>Pack is not intended for children under 13 years of age.</p>
    </Section>

    <Section title="Your Rights">
      <p>You may:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Export your Pack data</li>
        <li>Delete your account and associated cloud Pack data from Settings → Account</li>
        <li>Disable location access in your device settings</li>
        <li>Disable Pack Sync while keeping data on this device</li>
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
          href="mailto:info@okamidesigns.com"
          className="text-pack-text hover:text-pack-accent transition-colors"
        >
          info@okamidesigns.com
        </a>
      </p>
    </Section>
  </>
)
