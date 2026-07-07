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
      label: i.notes || i.event || getInteractionTypeLabel(i.interactionType) || 'Interaction',
      location: i.location,
      interactionType: i.interactionType,
      followUp: i.nextFollowUp,
      isMeeting: false,
    })),
  ]

  if (items.length === 0) {
    return (
      <p className="text-pack-text-muted py-4 text-center text-sm">No interactions yet</p>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 shrink-0 rounded-full ${
                'isMeeting' in item && item.isMeeting ? 'bg-pack-accent' : 'bg-pack-border'
              }`}
            />
            {index < items.length - 1 && (
              <div className="bg-pack-border my-1 w-0.5 flex-1 min-h-[24px]" />
            )}
          </div>
          <div className="pb-6">
            <p className="text-pack-text font-medium">{item.label}</p>
            {item.date && (
              <p className="text-pack-text-muted text-sm">{formatDate(item.date)}</p>
            )}
            {'interactionType' in item && item.interactionType && (
              <p className="text-pack-text-secondary text-xs">
                {getInteractionTypeLabel(item.interactionType)}
              </p>
            )}
            {'location' in item && item.location && (
              <p className="text-pack-text-secondary text-sm">Last seen at: {item.location}</p>
            )}
            {'followUp' in item && item.followUp && (
              <p className="text-pack-accent text-sm">Follow up: {formatDate(item.followUp)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
