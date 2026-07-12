const isDev = import.meta.env.DEV

export interface PersonLogMeta {
  personId: string
  databaseId?: string
  syncStatus?: string
  countBefore?: number
  countAfter?: number
}

function timestamp(): string {
  return new Date().toISOString()
}

export function logPersonCreate(meta: PersonLogMeta): void {
  if (!isDev) return
  console.log('[Pack] CREATE Person', { ...meta, timestamp: timestamp() })
}

export function logPersonUpdate(meta: PersonLogMeta): void {
  if (!isDev) return
  console.log('[Pack] UPDATE Person', { ...meta, timestamp: timestamp() })
}

export function logPersonDelete(meta: PersonLogMeta): void {
  if (!isDev) return
  console.log('[Pack] DELETE Person', { ...meta, timestamp: timestamp() })
}

export function logSyncCreate(table: string, recordId: string, syncStatus = 'queued'): void {
  if (!isDev) return
  console.log('[Pack] SYNC CREATE', { table, recordId, syncStatus, timestamp: timestamp() })
}

export function logSyncUpdate(table: string, recordId: string, syncStatus = 'queued'): void {
  if (!isDev) return
  console.log('[Pack] SYNC UPDATE', { table, recordId, syncStatus, timestamp: timestamp() })
}

export function logSyncDelete(table: string, recordId: string, syncStatus = 'queued'): void {
  if (!isDev) return
  console.log('[Pack] SYNC DELETE', { table, recordId, syncStatus, timestamp: timestamp() })
}

export function warnUnexpectedPersonCountChange(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  personId: string,
  countBefore: number,
  countAfter: number,
): void {
  const message = `[Pack] ${operation} Person ${personId}: Pack member count changed unexpectedly (${countBefore} → ${countAfter})`
  if (isDev) {
    console.warn(message)
  }
}
