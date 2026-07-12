import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  autoFocus?: boolean
  embedded?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search your Pack...',
  onFocus,
  autoFocus,
  embedded,
}: SearchBarProps) {
  const input = (
    <div className="relative">
      <Search className="text-pack-text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-3 pr-10 pl-10 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-3 -translate-y-1/2 p-1"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  if (embedded) {
    return <div className="w-full">{input}</div>
  }

  return (
    <div className="pack-elevated sticky top-0 z-30 px-4 py-3 safe-top">
      {input}
    </div>
  )
}
