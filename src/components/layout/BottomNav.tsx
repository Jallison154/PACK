import { Home, MapPin, Settings, Users, Search } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DESKTOP_BREAKPOINT, useIsDesktop } from '../ui/WorkspaceToggle'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/pack', icon: Users, label: 'My Pack' },
  { to: '/places', icon: MapPin, label: 'Places' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

/** Only Home uses exact matching; Settings must stay active on /settings/* subroutes. */
function navLinkEnd(path: string) {
  return path === '/'
}

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === '/add' || pathname.startsWith('/edit/')) return true
  if (pathname === '/places/add') return true
  if (/^\/places\/[^/]+\/edit$/.test(pathname)) return true
  return false
}

export function BottomNav() {
  const isDesktop = useIsDesktop(DESKTOP_BREAKPOINT)
  const { pathname } = useLocation()

  if (isDesktop || shouldHideBottomNav(pathname)) return null

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Main">
      <div className="mobile-bottom-nav__inner mx-auto flex max-w-lg items-center justify-around px-1 pt-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={navLinkEnd(to)} replace>
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                  isActive ? 'text-pack-accent' : 'text-pack-text-muted'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
