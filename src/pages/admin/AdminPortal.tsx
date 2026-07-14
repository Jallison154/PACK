import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PackLogo } from '../../components/brand/PackLogo'
import { useAdmin } from '../../context/AdminContext'
import { useAuth } from '../../context/AuthContext'
import { sectionsForRole, getAdminSection } from '../../admin/sections'
import { AdminGate } from '../../components/admin/AdminGate'
import { AdminSectionContent } from './AdminSectionContent'

export function AdminPortal() {
  return (
    <AdminGate>
      <AdminShell />
    </AdminGate>
  )
}

function AdminShell() {
  const { role } = useAdmin()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const sections = sectionsForRole(role)

  const pathPart = location.pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const sectionId = pathPart || 'overview'
  const section = getAdminSection(sectionId)

  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/overview" replace />
  }

  if (!section || !sections.some((s) => s.id === section.id)) {
    return <Navigate to="/admin/overview" replace />
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] text-pack-text">
      <div className="mx-auto flex min-h-dvh max-w-[1500px]">
        <aside className="border-pack-border hidden w-64 shrink-0 border-r bg-[#121212] lg:flex lg:flex-col">
          <div className="border-pack-border border-b px-5 py-4">
            <PackLogo size="sm" align="left" />
            <p className="text-pack-accent mt-3 text-[11px] font-medium tracking-wide uppercase">
              Admin Portal
            </p>
            <p className="text-pack-text-muted mt-1 truncate text-xs">
              {user?.email} · {role}
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {sections.map(({ id, title, icon: Icon }) => (
              <NavLink
                key={id}
                to={`/admin/${id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-pack-accent/15 text-pack-accent'
                      : 'text-pack-text-secondary hover:bg-white/5 hover:text-pack-text'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {title}
              </NavLink>
            ))}
          </nav>
          <div className="border-pack-border border-t p-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-pack-text-muted hover:text-pack-text flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Pack
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-pack-border flex items-center gap-3 border-b px-4 py-3 lg:px-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-pack-text-muted hover:text-pack-text lg:hidden"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-pack-text truncate text-lg font-semibold">{section.title}</h1>
              <p className="text-pack-text-muted truncate text-sm">{section.subtitle}</p>
            </div>
            <span className="text-pack-accent hidden rounded-full bg-[#FF6A2D]/15 px-2.5 py-1 text-[11px] font-medium capitalize sm:inline">
              {role}
            </span>
          </header>

          <div className="border-pack-border flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden">
            {sections.map(({ id, title }) => (
              <NavLink
                key={id}
                to={`/admin/${id}`}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-3 py-1.5 text-xs ${
                    isActive
                      ? 'bg-pack-accent/15 text-pack-accent'
                      : 'text-pack-text-muted hover:text-pack-text'
                  }`
                }
              >
                {title}
              </NavLink>
            ))}
          </div>

          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <AdminSectionContent sectionId={section.id} />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
