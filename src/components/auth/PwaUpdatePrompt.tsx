import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null

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
    <div className="page-px mx-auto max-w-lg pt-3 md:max-w-5xl">
      <div className="pack-surface flex items-center justify-between gap-3 rounded-2xl p-4">
        <p className="text-pack-text text-sm font-medium">A new Pack version is available.</p>
        <button
          type="button"
          onClick={() => void updateServiceWorker?.(true)}
          className="bg-pack-accent shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-black"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
