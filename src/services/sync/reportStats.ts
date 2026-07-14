import { db } from '../../db/database'
import { getSupabase } from '../../lib/supabase'
import { countPackMembers } from '../../db/repositories/people'
import { listSyncQueue } from './queue'
import { isCloudSyncEnabled } from './types'

export interface DevicePackStats {
  storageBytes: number
  peopleCount: number
  placesCount: number
  pendingCount: number
}

/** Same sources as Settings → Database size / local Pack counts. */
export async function readDevicePackStats(): Promise<DevicePackStats> {
  const [data, peopleCount, placesRows, pending] = await Promise.all([
    db.exportDatabase(),
    countPackMembers(),
    db.query<{ count: number }>('SELECT COUNT(*) as count FROM places WHERE deleted_at IS NULL'),
    listSyncQueue().catch(() => []),
  ])

  return {
    storageBytes: data?.byteLength ?? 0,
    peopleCount,
    placesCount: placesRows[0]?.count ?? 0,
    pendingCount: pending.length,
  }
}

/** Push privacy-safe device stats for Admin (matches Settings → Database size). */
export async function reportDevicePackStats(options?: {
  lastSyncError?: string | null
}): Promise<DevicePackStats | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const stats = await readDevicePackStats()

    const { error } = await supabase.rpc('report_my_pack_stats', {
      p_storage_bytes: stats.storageBytes,
      p_pending_sync_count: stats.pendingCount,
      p_last_sync_error: options?.lastSyncError ?? null,
      p_sync_enabled: isCloudSyncEnabled(),
    })

    if (error) {
      console.warn('[Pack Sync] Could not report device stats:', error.message)
    }

    return stats
  } catch (error) {
    console.warn('[Pack Sync] Could not report device stats:', error)
    return null
  }
}
