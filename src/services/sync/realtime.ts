import type { RealtimeChannel } from '@supabase/supabase-js'
import { db } from '../../db/database'
import { getSupabase } from '../../lib/supabase'
import { applyRemoteRow, type SyncTableName } from './engine'
import { logSupabaseError } from './errors'
import { notifyDataChanged } from './dataEvents'

const REALTIME_TABLES: SyncTableName[] = [
  'people',
  'places',
  'companies',
  'interactions',
  'households',
  'tags',
]

export type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'unavailable'

let channel: RealtimeChannel | null = null
let connectionState: RealtimeConnectionState = 'disconnected'
let stateListener: ((state: RealtimeConnectionState) => void) | null = null
let activeUserId: string | null = null

export function getRealtimeConnectionState(): RealtimeConnectionState {
  return connectionState
}

export function onRealtimeConnectionStateChange(
  listener: (state: RealtimeConnectionState) => void,
): () => void {
  stateListener = listener
  listener(connectionState)
  return () => {
    if (stateListener === listener) {
      stateListener = null
    }
  }
}

function setConnectionState(state: RealtimeConnectionState): void {
  connectionState = state
  stateListener?.(state)
}

async function handleRealtimePayload(
  table: SyncTableName,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  row: Record<string, unknown> | null,
  oldRow: Record<string, unknown> | null,
): Promise<void> {
  if (eventType === 'DELETE') {
    const record = oldRow ?? row
    if (!record) return

    const recordId =
      table === 'person_tags'
        ? String(record.person_id ?? '')
        : String(record.id ?? '')

    if (!recordId) return

    if (table === 'person_tags') {
      await db.withoutSyncNotifications(async () => {
        await db.run('DELETE FROM person_tags WHERE person_id = ? AND tag_id = ?', [
          record.person_id,
          record.tag_id,
        ])
      })
    } else if (table === 'people' || table === 'places') {
      await db.withoutSyncNotifications(async () => {
        const now = new Date().toISOString()
        await db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
          now,
          now,
          recordId,
        ])
      })
    } else {
      await db.withoutSyncNotifications(async () => {
        await db.run(`DELETE FROM ${table} WHERE id = ?`, [recordId])
      })
    }

    notifyDataChanged('realtime', [table])
    return
  }

  if (!row) return

  if (
    (table === 'people' || table === 'places') &&
    row.deleted_at != null &&
    String(row.deleted_at).length > 0
  ) {
    const recordId = String(row.id ?? '')
    if (!recordId) return

    await db.withoutSyncNotifications(async () => {
      const now = new Date().toISOString()
      await db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        row.deleted_at,
        row.updated_at ?? now,
        recordId,
      ])
    })

    notifyDataChanged('realtime', [table])
    return
  }

  const recordId = String(row.id ?? row.person_id ?? '')
  if (!recordId) return

  const existing = await db.query(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [recordId])

  if (eventType === 'INSERT' && existing.length > 0) {
    await db.withoutSyncNotifications(() => applyRemoteRow(table, row))
  } else if (eventType === 'INSERT') {
    await db.withoutSyncNotifications(() => applyRemoteRow(table, row))
  } else {
    await db.withoutSyncNotifications(() => applyRemoteRow(table, row))
  }

  notifyDataChanged('realtime', [table])
}

export function subscribeToRealtimeChanges(userId: string): void {
  const supabase = getSupabase()
  if (!supabase) {
    setConnectionState('unavailable')
    return
  }

  if (channel && activeUserId === userId) {
    return
  }

  unsubscribeFromRealtimeChanges()
  activeUserId = userId
  setConnectionState('connecting')

  channel = supabase.channel(`pack-sync:${userId}`)

  for (const table of REALTIME_TABLES) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        void handleRealtimePayload(
          table,
          payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          payload.new as Record<string, unknown> | null,
          payload.old as Record<string, unknown> | null,
        ).catch((error) => {
          logSupabaseError({
            operation: 'realtime apply',
            table,
            userId,
            ...extractError(error),
          })
        })
      },
    )
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setConnectionState('connected')
      return
    }

    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      setConnectionState('unavailable')
      logSupabaseError({
        operation: 'realtime subscribe',
        userId,
        message: `Realtime channel status: ${status}`,
      })
      return
    }

    if (status === 'CLOSED') {
      setConnectionState('disconnected')
    }
  })
}

function extractError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: String(error) }
}

export function unsubscribeFromRealtimeChanges(): void {
  const supabase = getSupabase()
  if (channel && supabase) {
    void supabase.removeChannel(channel)
  }
  channel = null
  activeUserId = null
  setConnectionState('disconnected')
}
