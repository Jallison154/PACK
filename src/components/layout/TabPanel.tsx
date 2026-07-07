import type { ReactNode } from 'react'

export const MAIN_TAB_PATHS = ['/', '/search', '/pack', '/places', '/settings'] as const
export type MainTabPath = (typeof MAIN_TAB_PATHS)[number]

export function isMainTabPath(path: string): path is MainTabPath {
  return (MAIN_TAB_PATHS as readonly string[]).includes(path)
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
      className={active ? 'block' : 'hidden'}
    >
      {children}
    </div>
  )
}
