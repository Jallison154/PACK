const STORAGE_KEY = 'pack_recent_searches'
const MAX_RECENT = 8

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return getRecentSearches()

  const next = [trimmed, ...getRecentSearches().filter((q) => q !== trimmed)].slice(
    0,
    MAX_RECENT,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function removeRecentSearch(query: string): string[] {
  const next = getRecentSearches().filter((q) => q !== query)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
