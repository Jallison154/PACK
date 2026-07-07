import { Home, MapPin, Settings, Users, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useIsDesktop } from '../ui/WorkspaceToggle'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/pack', icon: Users, label: 'My Pack' },
  { to: '/places', icon: MapPin, label: 'Places' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const isDesktop = useIsDesktop(768)

  if (isDesktop) return null

  return (
    <nav className="pack-nav fixed right-0 bottom-0 left-0 z-30 rounded-t-[1.25rem] safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/' || to !== '/settings'} replace>
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                  isActive ? 'text-pack-accent' : 'text-pack-text-muted'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
