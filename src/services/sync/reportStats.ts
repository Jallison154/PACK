import { db } from '../../db/database'
import { getSupabase } from '../../lib/supabase'
import { listSyncQueue } from './queue'
import { isCloudSyncEnabled } from './types'

/** Push privacy-safe device stats for Admin (matches Settings → Database size). */
export async function reportDevicePackStats(options?: {
  lastSyncError?: string | null
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const data = await db.exportDatabase()
    const storageBytes = data?.byteLength ?? 0
    const pending = (await listSyncQueue().catch(() => [])).length

    const { error } = await supabase.rpc('report_my_pack_stats', {
      p_storage_bytes: storageBytes,
      p_pending_sync_count: pending,
      p_last_sync_error: options?.lastSyncError ?? null,
      p_sync_enabled: isCloudSyncEnabled(),
    })

    if (error) {
      console.warn('[Pack Sync] Could not report device stats:', error.message)
    }
  } catch (error) {
    console.warn('[Pack Sync] Could not report device stats:', error)
  }
}
