import { MobilePageShell } from '../components/layout/MobilePageShell'
import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Star,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  ArrowLeft,
  Briefcase,
  Users,
  Calendar,
  Building2,
  Home,
  Tag,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { TagChip } from '../components/ui/TagChip'
import { Timeline } from '../components/ui/Timeline'
import { AddInteractionSheet } from '../components/person/AddInteractionSheet'
import { PackMapPreview } from '../components/places/PackMap'
import {
  getPersonById,
  deletePerson,
  toggleFavorite,
} from '../db/repositories/people'
import {
  getInteractionsWithPlaces,
  type InteractionWithPlaceName,
} from '../db/repositories/interactions'
import { getPlaceById } from '../db/repositories/places'
import { formatWhereMetDisplay } from '../utils/encounterLocation'
import { formatDate, formatLocation } from '../utils/format'
import {
  WORKSPACES,
  getRelationshipLabel,
  type PersonWithTags,
  type Place,
} from '../types'

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

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-10">
      <h2 className="text-pack-text-muted/80 mb-2 px-1 text-[13px] font-medium tracking-wide">
        {title}
      </h2>
      <div className="border-pack-border divide-pack-border/50 divide-y rounded-2xl border bg-[#171717] px-3">
        {children}
      </div>
    </section>
  )
}

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<PersonWithTags | null>(null)
  const [interactions, setInteractions] = useState<InteractionWithPlaceName[]>([])
  const [lastSeenPlace, setLastSeenPlace] = useState<Place | null>(null)
  const [whereMetPlace, setWhereMetPlace] = useState<Place | null>(null)
  const [showAddInteraction, setShowAddInteraction] = useState(false)

  const load = async () => {
    if (!id) return
    const [p, ints] = await Promise.all([
      getPersonById(id),
      getInteractionsWithPlaces(id),
    ])
    setPerson(p)
    setInteractions(ints)

    if (p?.lastSeenPlaceId) {
      void getPlaceById(p.lastSeenPlaceId).then(setLastSeenPlace)
    } else {
      setLastSeenPlace(null)
    }

    if (p?.whereMetPlaceId) {
      void getPlaceById(p.whereMetPlaceId).then(setWhereMetPlace)
    } else {
      setWhereMetPlace(null)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const handleFavorite = async () => {
    if (!id) return
    await toggleFavorite(id)
    void load()
  }

  const handleDelete = async () => {
    if (!id || !confirm('Remove this person and their memories?')) return
    await deletePerson(id)
    navigate('/', { replace: true })
  }

  if (!person) {
    return (
      <MobilePageShell inShell={false} top={false} padded={false}>
        <div className="page-nav-top page-px flex items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-pack-text-muted hover:text-pack-text flex h-10 w-10 items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="page-px mx-auto max-w-lg pt-4">
          <div className="pack-elevated h-64 animate-pulse" />
        </div>
      </MobilePageShell>
    )
  }

  const whereMetDisplay = formatWhereMetDisplay(person, person.whereMetPlaceName)
  const lastSeenPlaceLabel = person.lastSeenPlaceName || person.lastSeenAt
  const locationLine = formatLocation(person.city, person.state)
  const relationship = getRelationshipLabel(person.relationshipType)
  const workspaceLabel = WORKSPACES.find((w) => w.value === person.workspace)?.label
  const hasApproximateWhereMet = person.whereMetIsApproximate && !person.whereMetPlaceId
  const mapPlace = lastSeenPlace ?? whereMetPlace

  const aboutRows: Array<{ label: string; value: string; icon?: ReactNode; href?: string }> = []
  if (relationship) {
    aboutRows.push({
      label: 'Connection',
      value: relationship,
      icon: <Users className="h-4 w-4" />,
    })
  }
  if (workspaceLabel) {
    aboutRows.push({
      label: 'Workspace',
      value: workspaceLabel,
      icon: <Briefcase className="h-4 w-4" />,
    })
  }
  if (person.company) {
    aboutRows.push({
      label: 'Company',
      value: person.company,
      icon: <Building2 className="h-4 w-4" />,
    })
  }
  if (person.jobTitle) {
    aboutRows.push({
      label: 'Job title',
      value: person.jobTitle,
      icon: <Briefcase className="h-4 w-4" />,
    })
  }
  if (person.householdName) {
    aboutRows.push({
      label: 'Household',
      value: person.householdName,
      icon: <Home className="h-4 w-4" />,
    })
  }
  if (whereMetDisplay) {
    aboutRows.push({
      label: 'Where met',
      value: whereMetDisplay,
      icon: <MapPin className="h-4 w-4" />,
    })
  }
  if (person.event) {
    aboutRows.push({
      label: 'Event',
      value: person.event,
      icon: <Calendar className="h-4 w-4" />,
    })
  }
  if (person.dateMet) {
    aboutRows.push({
      label: 'Date met',
      value: formatDate(person.dateMet),
      icon: <Calendar className="h-4 w-4" />,
    })
  }
  if (locationLine) {
    aboutRows.push({
      label: 'City / State',
      value: locationLine,
      icon: <MapPin className="h-4 w-4" />,
    })
  }
  if (person.homeAddress) {
    aboutRows.push({
      label: 'Home address',
      value: person.homeAddress,
      icon: <Home className="h-4 w-4" />,
    })
  }
  if (person.workLocation) {
    aboutRows.push({
      label: 'Work location',
      value: person.workLocation,
      icon: <Building2 className="h-4 w-4" />,
    })
  }

  const lastSeenRows: Array<{ label: string; value: string; icon?: ReactNode }> = []
  if (lastSeenPlaceLabel) {
    lastSeenRows.push({
      label: 'Last seen at',
      value: lastSeenPlaceLabel,
      icon: <MapPin className="h-4 w-4" />,
    })
  }
  if (person.lastSeenDate) {
    lastSeenRows.push({
      label: 'Last seen date',
      value: formatDate(person.lastSeenDate),
      icon: <Calendar className="h-4 w-4" />,
    })
  }
  if (person.lastInteractionNotes) {
    lastSeenRows.push({
      label: 'Latest trail notes',
      value: person.lastInteractionNotes,
    })
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

  const subtitle = [person.jobTitle, person.company].filter(Boolean).join(' · ')

  return (
    <MobilePageShell inShell={false} top={false} padded={false}>
      <div className="page-nav-top page-px flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-pack-text-muted hover:text-pack-text flex h-10 w-10 items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-px mx-auto max-w-lg pt-4 pb-10"
      >
        <div className="mb-8 text-center">
          <Avatar name={person.name} color={person.profileColor} size="lg" />
          <h1 className="text-pack-text mt-5 text-3xl font-semibold tracking-tight">
            {person.name}
          </h1>
          {subtitle && (
            <p className="text-pack-text-secondary mt-1.5 text-base">{subtitle}</p>
          )}
          {relationship && (
            <p className="text-pack-text-muted mt-1 text-sm">{relationship}</p>
          )}
          {hasApproximateWhereMet && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/edit/${person.id}`)}
            >
              Choose exact place
            </Button>
          )}
        </div>

        <Button className="mb-10 w-full" onClick={() => setShowAddInteraction(true)}>
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
          <section className="mb-10">
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
          <section className="mb-10">
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
          <section className="mb-10">
            <h2 className="text-pack-text-muted/80 mb-3 px-1 text-[13px] font-medium tracking-wide">
              {lastSeenPlace ? 'Last seen place' : 'Where met'}
            </h2>
            <PackMapPreview place={mapPlace} height="180px" />
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-pack-text-muted/80 mb-3 px-1 text-[13px] font-medium tracking-wide">
            Trail
          </h2>
          <Timeline
            interactions={interactions}
            meetingLabel={whereMetDisplay ? `Where met: ${whereMetDisplay}` : undefined}
          />
        </section>

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/edit/${person.id}`)}
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
      </motion.div>

      <AddInteractionSheet
        personId={person.id}
        personName={person.name}
        open={showAddInteraction}
        onClose={() => setShowAddInteraction(false)}
        onSaved={() => void load()}
      />
    </MobilePageShell>
  )
}
