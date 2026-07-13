/** True when launched from iPhone Home Screen (standalone PWA), not Safari browser chrome. */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari fallback — not in standard Navigator typings
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Adds `standalone-pwa` on <html> so CSS can skip Safari browser-toolbar compensation. */
export function applyStandalonePwaClass(): void {
  if (!isStandalonePWA()) return
  document.documentElement.classList.add('standalone-pwa')
}
