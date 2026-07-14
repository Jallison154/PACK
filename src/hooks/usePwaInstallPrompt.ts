import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStandalonePwa } from './useStandalonePwa'
import {
  isIosDevice,
  isMobileDevice,
} from '../utils/standalonePwa'
import {
  clearPwaInstallOffer,
  getDeferredInstallPrompt,
  isPwaInstallOfferPending,
  promptPwaInstall,
  subscribePwaInstallPrompt,
  PWA_INSTALL_STORAGE_KEYS,
} from '../services/pwa/installPrompt'

export function usePwaInstallPrompt() {
  const { isAuthenticated, sessionRestored } = useAuth()
  const isStandalone = useStandalonePwa()
  const [isMobile, setIsMobile] = useState(() => isMobileDevice())
  const [isIos, setIsIos] = useState(() => isIosDevice())
  const [canNativeInstall, setCanNativeInstall] = useState(
    () => getDeferredInstallPrompt() != null,
  )
  const [offerPending, setOfferPending] = useState(() => isPwaInstallOfferPending())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(PWA_INSTALL_STORAGE_KEYS.dismissed) === 'true'
    } catch {
      return false
    }
  })
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const sync = () => {
      setIsMobile(isMobileDevice())
      setIsIos(isIosDevice())
      setCanNativeInstall(getDeferredInstallPrompt() != null)
      setOfferPending(isPwaInstallOfferPending())
    }
    sync()
    return subscribePwaInstallPrompt(sync)
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(PWA_INSTALL_STORAGE_KEYS.dismissed, 'true')
    } catch {
      // ignore
    }
    clearPwaInstallOffer()
    setDismissed(true)
    setOfferPending(false)
    setShowIosHelp(false)
  }, [])

  const install = useCallback(async () => {
    if (canNativeInstall) {
      const outcome = await promptPwaInstall()
      if (outcome === 'accepted') {
        dismiss()
        return 'accepted' as const
      }
      if (outcome === 'dismissed') return 'dismissed' as const
    }
    // iOS (and Android without a deferred install event) need manual steps
    setShowIosHelp(true)
    return 'manual-help' as const
  }, [canNativeInstall, dismiss])

  const shouldPrompt =
    sessionRestored &&
    isAuthenticated &&
    offerPending &&
    !isStandalone &&
    isMobile &&
    !dismissed

  /** Settings (and other manual entry points) — available anytime in a mobile browser. */
  const canManualInstall = !isStandalone && isMobile

  return {
    isStandalone,
    isMobile,
    isIos,
    canNativeInstall,
    canManualInstall,
    shouldPrompt,
    showIosHelp,
    setShowIosHelp,
    install,
    dismiss,
  }
}
