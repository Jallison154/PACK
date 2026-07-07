import { Home, MapPin, BarChart3, Settings, Star, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useIsDesktop } from '../ui/WorkspaceToggle'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/favorites', icon: Star, label: 'Saved' },
  { to: '/places', icon: MapPin, label: 'Places' },
  { to: '/dashboard', icon: BarChart3, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const isDesktop = useIsDesktop()

  if (isDesktop) return null

  return (
    <nav className="bg-pack-surface/95 border-pack-border/60 fixed right-0 bottom-0 left-0 z-30 border-t backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors ${
                  isActive ? 'text-pack-accent' : 'text-pack-text-muted'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] leading-tight font-medium">{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
