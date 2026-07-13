import type { ReactNode } from 'react'

export const MAIN_TAB_PATHS = ['/', '/search', '/pack', '/places', '/settings'] as const
export type MainTabPath = (typeof MAIN_TAB_PATHS)[number]

export function isMainTabPath(path: string): path is MainTabPath {
  if ((MAIN_TAB_PATHS as readonly string[]).includes(path)) return true
  return path.startsWith('/settings/')
}

export function getActiveMainTab(pathname: string): MainTabPath {
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return '/settings'
  if (isMainTabPath(pathname)) return pathname
  return '/'
}

interface TabPanelProps {
  active: boolean
  children: ReactNode
  label: string
}

/** Keeps tab content mounted so scroll position and form state persist. */
export function TabPanel({ active, children, label }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      aria-label={label}
      aria-hidden={!active}
      className={active ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
    >
      {children}
    </div>
  )
}
