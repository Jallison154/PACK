export const PACK_DATA_CHANGED = 'pack:data-changed'

export interface PackDataChangedDetail {
  source: 'sync' | 'realtime' | 'local'
  tables?: string[]
}

export function notifyDataChanged(
  source: PackDataChangedDetail['source'] = 'sync',
  tables?: string[],
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<PackDataChangedDetail>(PACK_DATA_CHANGED, {
      detail: { source, tables },
    }),
  )
}
