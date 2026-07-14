import { useCallback, useEffect, useState } from 'react'
import { useStandalonePwa } from './useStandalonePwa'
import {
  isIosDevice,
  isMobileDevice,
} from '../utils/standalonePwa'
import {
  getDeferredInstallPrompt,
  promptPwaInstall,
  subscribePwaInstallPrompt,
  PWA_INSTALL_STORAGE_KEYS,
} from '../services/pwa/installPrompt'

export function usePwaInstallPrompt() {
  const isStandalone = useStandalonePwa()
  const [isMobile, setIsMobile] = useState(() => isMobileDevice())
  const [isIos, setIsIos] = useState(() => isIosDevice())
  const [canNativeInstall, setCanNativeInstall] = useState(
    () => getDeferredInstallPrompt() != null,
  )
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
    setDismissed(true)
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

  const shouldPrompt = !isStandalone && isMobile && !dismissed

  return {
    isStandalone,
    isMobile,
    isIos,
    canNativeInstall,
    shouldPrompt,
    showIosHelp,
    setShowIosHelp,
    install,
    dismiss,
  }
}
