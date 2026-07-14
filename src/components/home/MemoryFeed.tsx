import { useNavigate } from 'react-router-dom'
import { groupMemoryFeed, type MemoryItem } from '../../utils/memoryFeed'

interface MemoryFeedProps {
  items: MemoryItem[]
  flat?: boolean
  onOpenPerson?: (personId: string) => void
}

export function MemoryFeed({ items, flat, onOpenPerson }: MemoryFeedProps) {
  const navigate = useNavigate()
  const groups = flat ? [{ label: '', items }] : groupMemoryFeed(items)

  if (groups.length === 0) return null

  const openPerson = (personId: string) => {
    if (onOpenPerson) onOpenPerson(personId)
    else navigate(`/person/${personId}`)
  }

  const renderItem = (item: MemoryItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => openPerson(item.personId)}
      className="hover:bg-pack-card-hover/50 w-full rounded-xl px-1 py-2.5 text-left transition-colors"
    >
      <p className="text-pack-text text-[15px] leading-snug">
        <span className="font-medium">{item.personName}</span>
        {(item.place || item.detail) && (
          <span className="text-pack-text-muted">
            {' '}
            · {[item.place, item.detail].filter(Boolean).join(' · ')}
          </span>
        )}
      </p>
    </button>
  )

  if (flat) {
    return <div>{items.map(renderItem)}</div>
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-pack-text-muted/70 mb-2 px-1 text-[11px]">{group.label}</p>
          <div>{group.items.map(renderItem)}</div>
        </div>
      ))}
    </div>
  )
}
