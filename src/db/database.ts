import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { MIGRATIONS } from './schema'

type QueryResult = Record<string, unknown>

class DatabaseService {
  private sqliteConn: SQLiteConnection | null = null
  private nativeDb: SQLiteDBConnection | null = null
  private webDb: SqlJsDatabase | null = null
  private activeUserId: string | null = null
  private initialized = false
  private readonly isNative = Capacitor.isNativePlatform()
  private syncNotifyDisabled = false

  getActiveUserId(): string | null {
    return this.activeUserId
  }

  private storageKey(): string {
    if (!this.activeUserId) {
      throw new Error('Pack database is not attached to an authenticated user.')
    }
    return `pack:${this.activeUserId}:sqlite`
  }

  private nativeDbName(): string {
    if (!this.activeUserId) {
      throw new Error('Pack database is not attached to an authenticated user.')
    }
    return `pack_${this.activeUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
  }

  async attachUser(userId: string): Promise<void> {
    if (this.activeUserId === userId && this.initialized) return
    await this.detachUser()
    this.activeUserId = userId
    this.initialized = false
    await this.init()
  }

  async detachUser(): Promise<void> {
    if (this.webDb && this.activeUserId) {
      try {
        const data = this.webDb.export()
        await this.saveToIndexedDB(data, this.storageKey())
      } catch {
        // best-effort persist before detach
      }
    }

    if (this.isNative && this.sqliteConn && this.nativeDb) {
      try {
        await this.sqliteConn.closeConnection(this.nativeDbName(), false)
      } catch {
        // ignore close errors
      }
    }

    this.webDb = null
    this.nativeDb = null
    this.activeUserId = null
    this.initialized = false
  }

  async init(): Promise<void> {
    if (!this.activeUserId) {
      throw new Error('Pack database is not attached to an authenticated user.')
    }
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
    const dbName = this.nativeDbName()
    const ret = await this.sqliteConn.checkConnectionsConsistency()
    const isConn = (await this.sqliteConn.isConnection(dbName, false)).result

    if (ret.result && isConn) {
      this.nativeDb = await this.sqliteConn.retrieveConnection(dbName, false)
    } else {
      this.nativeDb = await this.sqliteConn.createConnection(
        dbName,
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

    let saved = await this.loadFromIndexedDB(this.storageKey())
    if (!saved) {
      const legacy = await this.loadFromIndexedDB('sqlite')
      if (legacy) {
        saved = legacy
        await this.saveToIndexedDB(legacy, this.storageKey())
      }
    }

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

  async run(sql: string, params: unknown[] = []): Promise<number> {
    await this.init()

    if (this.isNative && this.nativeDb) {
      const result = await this.nativeDb.run(sql, params)
      await this.notifySyncChange(sql, params)
      return result.changes?.changes ?? 0
    }

    if (this.webDb) {
      this.webDb.run(sql, params)
      const changes = (
        this.webDb as SqlJsDatabase & { getRowsModified?: () => number }
      ).getRowsModified?.() ?? 0
      await this.persistWeb()
      await this.notifySyncChange(sql, params)
      return changes
    }

    return 0
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
    if (!this.webDb || !this.activeUserId) return
    const data = this.webDb.export()
    await this.saveToIndexedDB(data, this.storageKey())
  }

  private async loadFromIndexedDB(key: string): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('pack_storage', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('database')
      }
      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readonly')
        const getReq = tx.objectStore('database').get(key)
        getReq.onsuccess = () => resolve(getReq.result ?? null)
        getReq.onerror = () => resolve(null)
      }
      request.onerror = () => resolve(null)
    })
  }

  private async saveToIndexedDB(data: Uint8Array, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pack_storage', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('database')
      }
      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readwrite')
        tx.objectStore('database').put(data, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const db = new DatabaseService()

import type { EncounterLocationSource, InteractionType, RelationshipType, Workspace } from '../types'

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
    whereMetLatitude: row.where_met_latitude != null ? Number(row.where_met_latitude) : null,
    whereMetLongitude: row.where_met_longitude != null ? Number(row.where_met_longitude) : null,
    whereMetLocationSource: (row.where_met_location_source as EncounterLocationSource) || null,
    whereMetLocationAccuracy:
      row.where_met_location_accuracy != null ? Number(row.where_met_location_accuracy) : null,
    whereMetCapturedAt: (row.where_met_captured_at as string) || null,
    whereMetIsApproximate: Boolean(row.where_met_is_approximate),
    whereMetAreaLabel: (row.where_met_area_label as string) || null,
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
