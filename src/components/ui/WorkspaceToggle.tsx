import { useState, useEffect } from 'react'
import type { Workspace } from '../../types'
import { WORKSPACES } from '../../types'

interface WorkspaceToggleProps {
  value: Workspace
  onChange: (ws: Workspace) => void
  size?: 'sm' | 'md'
}

export function WorkspaceToggle({ value, onChange, size = 'md' }: WorkspaceToggleProps) {
  return (
    <div
      className={`bg-pack-card border-pack-border inline-flex rounded-xl border p-1 ${
        size === 'sm' ? 'text-sm' : 'text-base'
      }`}
    >
      {WORKSPACES.map((ws: { value: Workspace; label: string; emoji: string }) => (
        <button
          key={ws.value}
          type="button"
          onClick={() => onChange(ws.value)}
          className={`rounded-lg px-3 py-2 font-medium transition-colors ${
            size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2.5'
          } ${
            value === ws.value
              ? 'bg-pack-accent text-black'
              : 'text-pack-text-secondary hover:text-pack-text'
          }`}
        >
          {ws.emoji} {ws.label}
        </button>
      ))}
    </div>
  )
}

export const DESKTOP_BREAKPOINT = 768

export function useIsDesktop(breakpoint = DESKTOP_BREAKPOINT) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= breakpoint,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isDesktop
}

/** True below the given min-width breakpoint (default 768px — mobile). */
export function useIsMobile(breakpoint = DESKTOP_BREAKPOINT) {
  return !useIsDesktop(breakpoint)
}
