import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { DB_NAME, MIGRATIONS } from './schema'

type QueryResult = Record<string, unknown>

class DatabaseService {
  private sqliteConn: SQLiteConnection | null = null
  private nativeDb: SQLiteDBConnection | null = null
  private webDb: SqlJsDatabase | null = null
  private initialized = false
  private readonly isNative = Capacitor.isNativePlatform()
  private syncNotifyDisabled = false

  async init(): Promise<void> {
    if (this.initialized) return

    if (this.isNative) {
      await this.initNative()
    } else {
      await this.initWeb()
    }

    this.initialized = true
  }

  private async initNative(): Promise<void> {
    this.sqliteConn = new SQLiteConnection(CapacitorSQLite)
    const ret = await this.sqliteConn.checkConnectionsConsistency()
    const isConn = (await this.sqliteConn.isConnection(DB_NAME, false)).result

    if (ret.result && isConn) {
      this.nativeDb = await this.sqliteConn.retrieveConnection(DB_NAME, false)
    } else {
      this.nativeDb = await this.sqliteConn.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        1,
        false,
      )
      await this.nativeDb.open()
    }

    for (const sql of MIGRATIONS) {
      try {
        await this.nativeDb.execute(sql)
      } catch {
        // ignore duplicate column / already exists
      }
    }
  }

  private async initWeb(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    })

    const saved = await this.loadFromIndexedDB()
    this.webDb = saved ? new SQL.Database(saved) : new SQL.Database()

    for (const sql of MIGRATIONS) {
      try {
        this.webDb.run(sql)
      } catch {
        // ignore duplicate column / already exists for ALTER migrations
      }
    }

    await this.persistWeb()
  }

  async query<T = QueryResult>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.init()

    if (this.isNative && this.nativeDb) {
      const result = await this.nativeDb.query(sql, params)
      return (result.values ?? []) as T[]
    }

    if (this.webDb) {
      const stmt = this.webDb.prepare(sql)
      stmt.bind(params)
      const rows: T[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T)
      }
      stmt.free()
      await this.persistWeb()
      return rows
    }

    return []
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.init()

    if (this.isNative && this.nativeDb) {
      await this.nativeDb.run(sql, params)
      await this.notifySyncChange(sql, params)
      return
    }

    if (this.webDb) {
      this.webDb.run(sql, params)
      await this.persistWeb()
      await this.notifySyncChange(sql, params)
    }
  }

  async withoutSyncNotifications<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.syncNotifyDisabled
    this.syncNotifyDisabled = true
    try {
      return await fn()
    } finally {
      this.syncNotifyDisabled = previous
    }
  }

  private async notifySyncChange(sql: string, params: unknown[]): Promise<void> {
    if (this.syncNotifyDisabled) return
    const normalized = sql.trim().toUpperCase()
    if (normalized.startsWith('SELECT') || normalized.includes('sync_queue')) return

    this.syncNotifyDisabled = true
    try {
      const { isCloudSyncEnabled } = await import('../services/sync/types')
      if (!isCloudSyncEnabled()) return

      const { parseWriteForSync, enqueueSyncChange, loadRowPayload } = await import(
        '../services/sync/queue'
      )
      const parsed = parseWriteForSync(sql, params)
      if (!parsed) return

      if (parsed.operation === 'delete') {
        await enqueueSyncChange(parsed.table, parsed.recordId, parsed.operation, {
          id: parsed.recordId,
        })
        return
      }

      const row = await loadRowPayload(parsed.table, parsed.recordId)
      if (row) {
        await enqueueSyncChange(parsed.table, parsed.recordId, parsed.operation, row)
      }
    } catch {
      // Sync enqueue is best-effort; never block local writes.
    } finally {
      this.syncNotifyDisabled = false
    }
  }

  async exportDatabase(): Promise<Uint8Array | null> {
    await this.init()
    if (this.webDb) {
      return this.webDb.export()
    }
    return null
  }

  async importDatabase(data: Uint8Array): Promise<void> {
    if (this.isNative) return

    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    })
    this.webDb = new SQL.Database(data)
    await this.persistWeb()
  }

  private async persistWeb(): Promise<void> {
    if (!this.webDb) return
    const data = this.webDb.export()
    await this.saveToIndexedDB(data)
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('pack_storage', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('database')
      }
      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readonly')
        const getReq = tx.objectStore('database').get('sqlite')
        getReq.onsuccess = () => resolve(getReq.result ?? null)
        getReq.onerror = () => resolve(null)
      }
      request.onerror = () => resolve(null)
    })
  }

  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pack_storage', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('database')
      }
      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readwrite')
        tx.objectStore('database').put(data, 'sqlite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new DatabaseService()

import type { InteractionType, RelationshipType, Workspace } from '../types'

function rowToPerson(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    workspace: ((row.workspace as string) || 'work') as Workspace,
    phone: (row.phone as string) || null,
    email: (row.email as string) || null,
    company: (row.company as string) || null,
    companyId: (row.company_id as string) || null,
    jobTitle: (row.job_title as string) || null,
    whereMet: (row.where_met as string) || null,
    event: (row.event as string) || null,
    city: (row.city as string) || null,
    state: (row.state as string) || null,
    locationId: (row.location_id as string) || null,
    whereMetPlaceId: (row.where_met_place_id as string) || null,
    lastSeenPlaceId: (row.last_seen_place_id as string) || null,
    dateMet: (row.date_met as string) || null,
    notes: (row.notes as string) || null,
    relationshipType: (row.relationship_type as RelationshipType) || null,
    householdId: (row.household_id as string) || null,
    homeAddress: (row.home_address as string) || null,
    workLocation: (row.work_location as string) || null,
    lastSeenAt: (row.last_seen_at as string) || null,
    lastSeenDate: (row.last_seen_date as string) || null,
    lastInteractionNotes: (row.last_interaction_notes as string) || null,
    profileColor: (row.profile_color as string) || '#52525B',
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    syncVersion: (row.sync_version as number) || 1,
    deletedAt: (row.deleted_at as string) || null,
  }
}

function rowToInteraction(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    personId: row.person_id as string,
    date: row.date as string,
    location: (row.location as string) || null,
    placeId: (row.place_id as string) || null,
    interactionType: (row.interaction_type as InteractionType) || null,
    notes: (row.notes as string) || null,
    nextFollowUp: (row.next_follow_up as string) || null,
    event: (row.event as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    syncVersion: (row.sync_version as number) || 1,
  }
}

export { rowToPerson, rowToInteraction }
