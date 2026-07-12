type SyncTrigger = () => void | Promise<void>

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingTrigger: SyncTrigger | null = null

const DEBOUNCE_MS = 1500

export function scheduleDebouncedSync(trigger: SyncTrigger): void {
  pendingTrigger = trigger

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    const run = pendingTrigger
    pendingTrigger = null
    void run?.()
  }, DEBOUNCE_MS)
}

export function cancelDebouncedSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pendingTrigger = null
}
