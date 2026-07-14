import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : __BUILD_TIME__

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null

async function activateWaitingWorkerAndReload(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration()
  const waiting = registration?.waiting

  if (!waiting) {
    await updateServiceWorker?.(true)
    window.location.reload()
    return
  }

  await new Promise<void>((resolve) => {
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      resolve()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    waiting.postMessage({ type: 'SKIP_WAITING' })
    void updateServiceWorker?.(true)
    window.setTimeout(() => resolve(), 2500)
  })

  window.location.reload()
}

export function PwaUpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    updateServiceWorker = registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        registration?.update().catch(() => {
          // iOS Safari may reject update checks while backgrounded.
        })
      },
      onNeedRefresh() {
        setUpdateReady(true)
      },
      onOfflineReady() {
        // The app shell is ready for offline use; no UI needed.
      },
    })
  }, [])

  if (!updateReady) return null

  return (
    <div className="w-full max-w-lg md:max-w-5xl">
      <div className="pack-surface flex min-w-0 items-center justify-between gap-3 rounded-2xl p-4">
        <div className="min-w-0">
          <p className="text-pack-text text-sm font-medium">A new Pack version is available.</p>
          <p className="text-pack-text-muted mt-1 truncate text-xs">Build {BUILD_ID}</p>
        </div>
        <button
          type="button"
          onClick={() => void activateWaitingWorkerAndReload()}
          className="bg-pack-accent shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-black"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
