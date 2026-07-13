import type { ReactNode } from 'react'

export interface MobilePageShellProps {
  children: ReactNode
  className?: string
  /** Standard top spacing (default on). Uses shell variant when inShell is true. */
  top?: boolean
  /** Horizontal page padding (default on). */
  padded?: boolean
  /** Reserve space above the mobile tab bar (default on). */
  bottomNavOffset?: boolean
  /** Inside AppLayout — safe-top is handled by .app-top-banners. */
  inShell?: boolean
  /** Use as the primary scroll container for the page. */
  scroll?: boolean
}

/**
 * Shared mobile page shell — safe areas, horizontal padding, and bottom-nav offset.
 * Use on tab pages and detail screens instead of ad-hoc padding.
 */
export function MobilePageShell({
  children,
  className = '',
  top = true,
  padded = true,
  bottomNavOffset = true,
  inShell = true,
  scroll = false,
}: MobilePageShellProps) {
  const shellClass = [
    'min-h-dvh min-w-0 w-full max-w-full',
    bottomNavOffset ? 'page-content-bottom' : '',
    scroll ? 'overflow-x-hidden overflow-y-auto overscroll-y-contain' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const topClass = top ? (inShell ? 'page-top-shell' : 'page-top') : ''
  const innerClass = [padded ? 'page-px' : '', topClass].filter(Boolean).join(' ')

  if (!padded && !top) {
    return <div className={shellClass}>{children}</div>
  }

  return (
    <div className={shellClass}>
      <div className={innerClass}>{children}</div>
    </div>
  )
}

export interface MobileFormPageProps {
  children: ReactNode
  actions: ReactNode
  className?: string
}

/** Full-screen form pages (Add/Edit) outside the tab shell — no bottom tab bar. */
export function MobileFormPage({ children, actions, className = '' }: MobileFormPageProps) {
  return (
    <div className={`mobile-form-page min-h-dvh min-w-0 w-full ${className}`}>
      <div className="page-top page-px mx-auto max-w-lg space-y-5 pb-4">{children}</div>
      <div className="mobile-form-actions pack-nav">{actions}</div>
    </div>
  )
}
