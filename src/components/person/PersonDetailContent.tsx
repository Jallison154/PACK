import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Briefcase,
  Users,
  Calendar,
  Building2,
  Home,
  Tag,
  X,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { TagChip } from '../ui/TagChip'
import { Timeline } from '../ui/Timeline'
import { AddInteractionSheet } from './AddInteractionSheet'
import { PackMapPreview } from '../places/PackMap'
import {
  getPersonById,
  deletePerson,
  toggleFavorite,
} from '../../db/repositories/people'
import {
  getInteractionsWithPlaces,
  type InteractionWithPlaceName,
} from '../../db/repositories/interactions'
import { getPlaceById } from '../../db/repositories/places'
import { formatWhereMetDisplay } from '../../utils/encounterLocation'
import { formatDate, formatLocation } from '../../utils/format'
import {
  WORKSPACES,
  getRelationshipLabel,
  type PersonWithTags,
  type Place,
} from '../../types'

function DetailRow({
  label,
  value,
  icon,
  href,
}: {
  label: string
  value: string
  icon?: ReactNode
  href?: string
}) {
  const content = (
    <>
      {icon && <span className="text-pack-text-muted mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="text-pack-text-muted block text-[11px] tracking-wide uppercase">
          {label}
        </span>
        <span className="text-pack-text mt-0.5 block text-sm leading-relaxed break-words">
          {value}
        </span>
      </span>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        className="hover:bg-pack-card-hover/40 flex items-start gap-3 rounded-xl px-1 py-2.5 transition-colors"
      >
        {content}
      </a>
    )
  }

  return <div className="flex items-start gap-3 px-1 py-2.5">{content}</div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-pack-text-muted/80 mb-2 px-1 text-[13px] font-medium tracking-wide">
        {title}
      </h2>
      <div className="border-pack-border divide-pack-border/50 divide-y rounded-2xl border bg-[#171717] px-3">
        {children}
      </div>
    </section>
  )
}

export interface PersonDetailContentProps {
  personId: string
  onClose?: () => void
  onDeleted?: () => void
  onChanged?: () => void
  /** When true, show a close (X) control instead of relying on page back. */
  showClose?: boolean
  className?: string
}

export function PersonDetailContent({
  personId,
  onClose,
  onDeleted,
  onChanged,
  showClose = false,
  className = '',
}: PersonDetailContentProps) {
  const navigate = useNavigate()
  const [person, setPerson] = useState<PersonWithTags | null>(null)
  const [interactions, setInteractions] = useState<InteractionWithPlaceName[]>([])
  const [lastSeenPlace, setLastSeenPlace] = useState<Place | null>(null)
  const [whereMetPlace, setWhereMetPlace] = useState<Place | null>(null)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [missing, setMissing] = useState(false)

  const load = async () => {
    const [p, ints] = await Promise.all([
      getPersonById(personId),
      getInteractionsWithPlaces(personId),
    ])
    if (!p) {
      setMissing(true)
      setPerson(null)
      return
    }
    setMissing(false)
    setPerson(p)
    setInteractions(ints)

    if (p.lastSeenPlaceId) {
      void getPlaceById(p.lastSeenPlaceId).then(setLastSeenPlace)
    } else {
      setLastSeenPlace(null)
    }

    if (p.whereMetPlaceId) {
      void getPlaceById(p.whereMetPlaceId).then(setWhereMetPlace)
    } else {
      setWhereMetPlace(null)
    }
  }

  useEffect(() => {
    void load()
  }, [personId])

  const handleFavorite = async () => {
    await toggleFavorite(personId)
    await load()
    onChanged?.()
  }

  const handleDelete = async () => {
    if (!confirm('Remove this person and their memories?')) return
    await deletePerson(personId)
    onDeleted?.()
    onClose?.()
  }

  const handleEdit = () => {
    onClose?.()
    navigate(`/edit/${personId}`)
  }

  if (missing) {
    return (
      <div className={`px-4 py-10 text-center ${className}`}>
        <p className="text-pack-text-secondary text-sm">Pack member not found.</p>
        {onClose && (
          <Button variant="secondary" className="mt-4" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    )
  }

  if (!person) {
    return (
      <div className={`px-4 py-6 ${className}`}>
        <div className="pack-elevated h-48 animate-pulse rounded-2xl" />
      </div>
    )
  }

  const whereMetDisplay = formatWhereMetDisplay(person, person.whereMetPlaceName)
  const lastSeenPlaceLabel = person.lastSeenPlaceName || person.lastSeenAt
  const locationLine = formatLocation(person.city, person.state)
  const relationship = getRelationshipLabel(person.relationshipType)
  const workspaceLabel = WORKSPACES.find((w) => w.value === person.workspace)?.label
  const hasApproximateWhereMet = person.whereMetIsApproximate && !person.whereMetPlaceId
  const mapPlace = lastSeenPlace ?? whereMetPlace
  const subtitle = [person.jobTitle, person.company].filter(Boolean).join(' · ')

  const aboutRows: Array<{ label: string; value: string; icon?: ReactNode }> = []
  if (relationship) {
    aboutRows.push({ label: 'Connection', value: relationship, icon: <Users className="h-4 w-4" /> })
  }
  if (workspaceLabel) {
    aboutRows.push({ label: 'Workspace', value: workspaceLabel, icon: <Briefcase className="h-4 w-4" /> })
  }
  if (person.company) {
    aboutRows.push({ label: 'Company', value: person.company, icon: <Building2 className="h-4 w-4" /> })
  }
  if (person.jobTitle) {
    aboutRows.push({ label: 'Job title', value: person.jobTitle, icon: <Briefcase className="h-4 w-4" /> })
  }
  if (person.householdName) {
    aboutRows.push({ label: 'Household', value: person.householdName, icon: <Home className="h-4 w-4" /> })
  }
  if (whereMetDisplay) {
    aboutRows.push({ label: 'Where met', value: whereMetDisplay, icon: <MapPin className="h-4 w-4" /> })
  }
  if (person.event) {
    aboutRows.push({ label: 'Event', value: person.event, icon: <Calendar className="h-4 w-4" /> })
  }
  if (person.dateMet) {
    aboutRows.push({ label: 'Date met', value: formatDate(person.dateMet), icon: <Calendar className="h-4 w-4" /> })
  }
  if (locationLine) {
    aboutRows.push({ label: 'City / State', value: locationLine, icon: <MapPin className="h-4 w-4" /> })
  }
  if (person.homeAddress) {
    aboutRows.push({ label: 'Home address', value: person.homeAddress, icon: <Home className="h-4 w-4" /> })
  }
  if (person.workLocation) {
    aboutRows.push({ label: 'Work location', value: person.workLocation, icon: <Building2 className="h-4 w-4" /> })
  }

  const lastSeenRows: Array<{ label: string; value: string; icon?: ReactNode }> = []
  if (lastSeenPlaceLabel) {
    lastSeenRows.push({ label: 'Last seen at', value: lastSeenPlaceLabel, icon: <MapPin className="h-4 w-4" /> })
  }
  if (person.lastSeenDate) {
    lastSeenRows.push({ label: 'Last seen date', value: formatDate(person.lastSeenDate), icon: <Calendar className="h-4 w-4" /> })
  }
  if (person.lastInteractionNotes) {
    lastSeenRows.push({ label: 'Latest trail notes', value: person.lastInteractionNotes })
  }

  const contactRows: Array<{ label: string; value: string; icon: ReactNode; href: string }> = []
  if (person.phone) {
    contactRows.push({
      label: 'Phone',
      value: person.phone,
      icon: <Phone className="h-4 w-4" />,
      href: `tel:${person.phone}`,
    })
  }
  if (person.email) {
    contactRows.push({
      label: 'Email',
      value: person.email,
      icon: <Mail className="h-4 w-4" />,
      href: `mailto:${person.email}`,
    })
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-pack-text-muted hover:text-pack-text flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-10" />
        )}
        <button
          type="button"
          onClick={() => void handleFavorite()}
          className="flex h-10 w-10 items-center justify-center"
          aria-label={person.isFavorite ? 'Remove from Core Pack' : 'Add to Core Pack'}
        >
          <Star
            className={`h-5 w-5 ${person.isFavorite ? 'text-pack-accent fill-current' : 'text-pack-text-muted'}`}
          />
        </button>
      </div>

      <div className="mb-6 text-center">
        <Avatar name={person.name} color={person.profileColor} size="lg" />
        <h1 className="text-pack-text mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {person.name}
        </h1>
        {subtitle && (
          <p className="text-pack-text-secondary mt-1.5 text-base">{subtitle}</p>
        )}
        {relationship && (
          <p className="text-pack-text-muted mt-1 text-sm">{relationship}</p>
        )}
        {hasApproximateWhereMet && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={handleEdit}>
            Choose exact place
          </Button>
        )}
      </div>

      <Button className="mb-8 w-full" onClick={() => setShowAddInteraction(true)}>
        <Plus className="h-4 w-4" /> Add a memory
      </Button>

      {aboutRows.length > 0 && (
        <Section title="About">
          {aboutRows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}
        </Section>
      )}

      {contactRows.length > 0 && (
        <Section title="Contact">
          {contactRows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}
        </Section>
      )}

      {lastSeenRows.length > 0 && (
        <Section title="Last seen">
          {lastSeenRows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}
        </Section>
      )}

      {person.tags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-pack-text-muted/80 mb-3 flex items-center gap-2 px-1 text-[13px] font-medium tracking-wide">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </h2>
          <div className="flex flex-wrap gap-2 px-1">
            {person.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </section>
      )}

      {person.notes && (
        <section className="mb-8">
          <h2 className="text-pack-text-muted/80 mb-2 px-1 text-[13px] font-medium tracking-wide">
            Notes
          </h2>
          <div className="border-pack-border rounded-2xl border bg-[#171717] px-4 py-3">
            <p className="text-pack-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {person.notes}
            </p>
          </div>
        </section>
      )}

      {mapPlace && (
        <section className="mb-8">
          <h2 className="text-pack-text-muted/80 mb-3 px-1 text-[13px] font-medium tracking-wide">
            {lastSeenPlace ? 'Last seen place' : 'Where met'}
          </h2>
          <PackMapPreview place={mapPlace} height="180px" />
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-pack-text-muted/80 mb-3 px-1 text-[13px] font-medium tracking-wide">
          Trail
        </h2>
        <Timeline
          interactions={interactions}
          meetingLabel={whereMetDisplay ? `Where met: ${whereMetDisplay}` : undefined}
        />
      </section>

      <div className="flex items-center justify-between gap-4 pt-1 pb-2">
        <button
          type="button"
          onClick={handleEdit}
          className="text-pack-text-muted hover:text-pack-text-secondary flex items-center gap-2 text-sm transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="text-pack-text-muted hover:text-pack-danger flex items-center gap-2 text-sm transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>

      <AddInteractionSheet
        personId={person.id}
        personName={person.name}
        open={showAddInteraction}
        onClose={() => setShowAddInteraction(false)}
        onSaved={() => {
          void load()
          onChanged?.()
        }}
      />
    </div>
  )
}
