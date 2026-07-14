import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, MapPin, Briefcase, Cloud } from 'lucide-react'
import { PackLogo } from '../components/brand/PackLogo'
import { Button } from '../components/ui/Button'
import { AuthModal } from '../components/auth/AuthModal'
import { PwaInstallPrompt } from '../components/auth/PwaInstallPrompt'
import { isCloudSyncAvailable } from '../lib/env'

const FEATURES = [
  {
    icon: Users,
    title: 'Add someone in seconds',
    description: 'Capture a name, note, or moment before you forget it.',
  },
  {
    icon: MapPin,
    title: 'Remember where you met',
    description: 'Places and context stay tied to every connection.',
  },
  {
    icon: Briefcase,
    title: 'Work and personal, organized',
    description: 'Keep both sides of your life clear without mixing them up.',
  },
  {
    icon: Cloud,
    title: 'Your Pack across devices',
    description: 'Sign in once and pick up right where you left off.',
  },
] as const

export function PublicLandingPage() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const cloudAvailable = isCloudSyncAvailable()

  const openSignIn = () => {
    setAuthView('login')
    setAuthOpen(true)
  }

  const openSignUp = () => {
    setAuthView('signup')
    setAuthOpen(true)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-primary)]">
      <div className="app-notices !bottom-4">
        <PwaInstallPrompt />
      </div>
      <main className="page-px mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
        <div className="text-center">
          <PackLogo size="md" className="mx-auto" />
          <h1 className="text-pack-text mt-10 text-[2rem] leading-tight font-semibold tracking-tight">
            Remember every connection.
          </h1>
          <p className="text-pack-text-secondary mx-auto mt-4 max-w-md text-base leading-relaxed">
            Pack is a personal memory app for the people you meet. Save names, places, notes, and
            the moments that help you remember who someone is.
          </p>
        </div>

        <ul className="mt-10 space-y-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="pack-surface flex gap-4 rounded-2xl p-4">
              <div className="bg-pack-accent-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="text-pack-accent h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-pack-text text-sm font-medium">{title}</p>
                <p className="text-pack-text-muted mt-1 text-sm leading-relaxed">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-3">
          <Button className="w-full" onClick={openSignIn} disabled={!cloudAvailable}>
            Sign In
          </Button>
          <Button variant="secondary" className="w-full" onClick={openSignUp} disabled={!cloudAvailable}>
            Create Account
          </Button>
          {!cloudAvailable && (
            <p className="text-pack-warning text-center text-sm">
              Cloud sign-in is not configured on this server.
            </p>
          )}
        </div>

        <p className="text-pack-text-muted mt-6 text-center text-sm">
          <Link to="/privacy" className="hover:text-pack-text-secondary transition-colors">
            Privacy
          </Link>
          {' · '}
          <Link to="/terms" className="hover:text-pack-text-secondary transition-colors">
            Terms
          </Link>
        </p>
      </main>

      <footer className="text-pack-text-muted page-px pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs">
        Pack by Okami Designs
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialView={authView}
        onSuccess={() => setAuthOpen(false)}
      />
    </div>
  )
}
