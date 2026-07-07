import { Home, MapPin, BarChart3, Settings, Star, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useIsDesktop } from '../ui/WorkspaceToggle'
import { PackLogo } from '../brand/PackLogo'

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/favorites', icon: Star, label: 'Saved' },
  { to: '/places', icon: MapPin, label: 'Places' },
  { to: '/dashboard', icon: BarChart3, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function DesktopNav() {
  const isDesktop = useIsDesktop()
  if (!isDesktop) return null

  return (
    <nav className="bg-pack-surface/95 border-pack-border/60 sticky top-0 z-30 hidden border-b backdrop-blur-lg lg:block safe-top">
      <div className="mx-auto flex max-w-5xl items-center gap-0.5 px-4 py-2">
        <PackLogo href="/" size="sm" className="mr-6" />
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <span
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-pack-accent text-black' : 'text-pack-text-secondary hover:text-pack-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
