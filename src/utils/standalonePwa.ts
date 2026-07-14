/** True when launched from the Home Screen (standalone PWA), not the browser. */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari Home Screen — not in standard Navigator typings
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Phone / tablet-style device (coarse pointer or mobile UA). */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true
  // iPadOS desktop UA with touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return (
    window.matchMedia('(max-width: 768px)').matches &&
    window.matchMedia('(pointer: coarse)').matches
  )
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Adds `standalone-pwa` on <html> so CSS can skip Safari browser-toolbar compensation. */
export function applyStandalonePwaClass(): void {
  if (!isStandalonePWA()) return
  document.documentElement.classList.add('standalone-pwa')
}
