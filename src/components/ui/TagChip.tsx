interface TagChipProps {
  label: string
  onRemove?: () => void
  onClick?: () => void
  active?: boolean
}

export function TagChip({ label, onRemove, onClick, active }: TagChipProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-pack-accent text-black'
          : 'bg-pack-accent-muted text-pack-accent'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-black/10 ml-0.5 rounded-full p-0.5"
        >
          ×
        </button>
      )}
    </span>
  )
}
