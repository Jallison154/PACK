import { useSyncOptional } from '../../context/SyncContext'

export function SyncNoticeBanner() {
  const sync = useSyncOptional()
  if (!sync?.localNotice) return null

  return (
    <div className="app-notice">
      <div className="app-notice-panel flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-pack-accent/15 px-4 py-3 text-sm text-pack-accent backdrop-blur-md">
        <span>{sync.localNotice}</span>
        <button
          type="button"
          onClick={sync.dismissLocalNotice}
          className="text-pack-text-secondary hover:text-pack-text shrink-0 text-xs font-medium"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
