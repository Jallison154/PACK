import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search everyone...',
  onFocus,
  autoFocus,
}: SearchBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-pack-surface/80 border-pack-border sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-lg safe-top"
    >
      <div className="relative">
        <Search className="text-pack-text-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="bg-pack-card border-pack-border text-pack-text placeholder:text-pack-text-muted focus:border-pack-accent focus:ring-pack-accent/20 w-full rounded-2xl border py-3.5 pr-12 pl-12 text-base outline-none focus:ring-2"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-4 -translate-y-1/2 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
