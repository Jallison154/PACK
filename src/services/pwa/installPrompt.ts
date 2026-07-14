export const PWA_INSTALL_STORAGE_KEYS = {
  dismissed: 'pack_pwa_install_dismissed',
  installed: 'pack_pwa_installed',
  /** sessionStorage — armed after login/signup so we ask once that session */
  offerPending: 'pack_pwa_offer_pending',
} as const

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  emit()
}

function onAppInstalled() {
  deferredPrompt = null
  try {
    localStorage.setItem(PWA_INSTALL_STORAGE_KEYS.installed, 'true')
    localStorage.setItem(PWA_INSTALL_STORAGE_KEYS.dismissed, 'true')
  } catch {
    // ignore quota / private mode
  }
  emit()
}

/** Capture the install event as early as possible (before React mounts). */
export function initPwaInstallCapture(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

export function clearDeferredInstallPrompt(): void {
  deferredPrompt = null
  emit()
}

export function subscribePwaInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const promptEvent = deferredPrompt
  if (!promptEvent) return 'unavailable'
  deferredPrompt = null
  emit()
  await promptEvent.prompt()
  const choice = await promptEvent.userChoice
  return choice.outcome
}

/** Call after login / account creation so the Home Screen banner can appear. */
export function armPwaInstallOffer(): void {
  try {
    sessionStorage.setItem(PWA_INSTALL_STORAGE_KEYS.offerPending, 'true')
  } catch {
    // ignore quota / private mode
  }
  emit()
}

export function isPwaInstallOfferPending(): boolean {
  try {
    return sessionStorage.getItem(PWA_INSTALL_STORAGE_KEYS.offerPending) === 'true'
  } catch {
    return false
  }
}

export function clearPwaInstallOffer(): void {
  try {
    sessionStorage.removeItem(PWA_INSTALL_STORAGE_KEYS.offerPending)
  } catch {
    // ignore
  }
  emit()
}
