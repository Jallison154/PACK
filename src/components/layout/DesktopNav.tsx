import { Home, MapPin, Settings, Users, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useIsDesktop } from '../ui/WorkspaceToggle'
import { PackLogo } from '../brand/PackLogo'

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/pack', icon: Users, label: 'My Pack' },
  { to: '/places', icon: MapPin, label: 'Places' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function DesktopNav() {
  const isDesktop = useIsDesktop()
  if (!isDesktop) return null

  return (
    <nav className="pack-nav sticky top-0 z-30 hidden lg:block safe-top">
      <div className="mx-auto flex max-w-5xl items-center gap-0.5 px-5 py-3">
        <PackLogo href="/" size="sm" className="mr-8" />
        <div className="flex flex-1 items-center gap-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} replace>
            {({ isActive }) => (
              <span
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-pack-accent' : 'text-pack-text-secondary hover:text-pack-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            )}
          </NavLink>
        ))}
        </div>
      </div>
    </nav>
  )
}
