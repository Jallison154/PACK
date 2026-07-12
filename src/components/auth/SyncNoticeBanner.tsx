import { useSyncOptional } from '../../context/SyncContext'

export function SyncNoticeBanner() {
  const sync = useSyncOptional()
  if (!sync?.localNotice) return null

  return (
    <div className="page-px mx-auto max-w-lg pt-3 md:max-w-5xl">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-pack-accent/10 px-4 py-3 text-sm text-pack-accent">
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
