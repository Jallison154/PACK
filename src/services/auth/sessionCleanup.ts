import { db } from '../../db/database'
import { cancelDebouncedSync } from '../sync/debouncedSync'
import { unregisterSyncTrigger } from '../sync/queue'
import { unsubscribeFromRealtimeChanges } from '../sync/realtime'
import { setSyncMode } from '../sync/types'
import { notifyDataChanged } from '../sync/dataEvents'

const PROFILE_KEY_PREFIX = 'pack_user_profile:'

/** Clear in-memory session state on sign-out. Offline caches remain keyed by user id. */
export async function clearAuthenticatedSession(activeUserId?: string | null): Promise<void> {
  cancelDebouncedSync()
  unregisterSyncTrigger()
  unsubscribeFromRealtimeChanges()
  setSyncMode('local')

  await db.detachUser()

  sessionStorage.removeItem('pack_unlocked')

  if (activeUserId) {
    try {
      localStorage.removeItem(`${PROFILE_KEY_PREFIX}${activeUserId}`)
    } catch {
      // ignore storage errors
    }
  }

  notifyDataChanged('sync')
}
