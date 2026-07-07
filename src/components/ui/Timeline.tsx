import { formatDate } from '../../utils/format'
import { getInteractionTypeLabel } from '../../types'
import type { Interaction } from '../../types'

interface TimelineProps {
  interactions: Interaction[]
  meetingLabel?: string
}

export function Timeline({ interactions, meetingLabel }: TimelineProps) {
  const items = [
    ...(meetingLabel
      ? [{ id: 'meeting', date: '', label: meetingLabel, isMeeting: true }]
      : []),
    ...interactions.map((i) => ({
      id: i.id,
      date: i.date,
      label: i.notes || i.event || getInteractionTypeLabel(i.interactionType) || 'Memory',
      location: i.location,
      followUp: i.nextFollowUp,
      isMeeting: false,
    })),
  ]

  if (items.length === 0) {
    return (
      <p className="text-pack-text-muted py-2 text-center text-sm">No memories yet</p>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                'isMeeting' in item && item.isMeeting ? 'bg-pack-accent' : 'bg-pack-border'
              }`}
            />
            {index < items.length - 1 && (
              <div className="bg-pack-border/60 my-1 w-px flex-1 min-h-[20px]" />
            )}
          </div>
          <div className="pb-5">
            <p className="text-pack-text text-[15px] leading-snug">{item.label}</p>
            {item.date && (
              <p className="text-pack-text-muted mt-0.5 text-xs">{formatDate(item.date)}</p>
            )}
            {'location' in item && item.location && (
              <p className="text-pack-text-muted mt-0.5 text-xs">{item.location}</p>
            )}
            {'followUp' in item && item.followUp && (
              <p className="text-pack-text-muted mt-0.5 text-xs">
                Reconnect {formatDate(item.followUp)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
