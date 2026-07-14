import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { PackLogo } from '../brand/PackLogo'
import { useAdmin } from '../../context/AdminContext'

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, isStaff, role } = useAdmin()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-pack-text-muted text-sm">Checking admin access…</p>
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
        <PackLogo size="sm" />
        <div className="bg-pack-danger/10 text-pack-danger flex h-12 w-12 items-center justify-center rounded-2xl">
          <ShieldX className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-pack-text text-xl font-semibold">Access denied</h1>
          <p className="text-pack-text-muted mt-2 max-w-sm text-sm leading-relaxed">
            This area is restricted to Pack staff. Your current role is{' '}
            <span className="text-pack-text-secondary">{role}</span>.
          </p>
        </div>
        <Link
          to="/"
          className="bg-pack-accent rounded-xl px-4 py-2 text-sm font-medium text-black"
        >
          Back to Pack
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
