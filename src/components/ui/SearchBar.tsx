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
  placeholder = 'Search everyone...',
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
        className="bg-pack-card border-pack-border/80 text-pack-text placeholder:text-pack-text-muted focus:border-pack-accent/60 focus:ring-pack-accent/15 w-full rounded-xl border py-3 pr-10 pl-10 text-sm outline-none focus:ring-2"
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
    <div className="bg-pack-surface/80 border-pack-border/60 sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-lg safe-top">
      {input}
    </div>
  )
}
