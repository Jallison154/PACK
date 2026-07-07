import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Star,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Pencil,
  Trash2,
  MessageSquare,
  Plus,
  Home,
  Eye,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { TagChip } from '../components/ui/TagChip'
import { Timeline } from '../components/ui/Timeline'
import { AddInteractionSheet } from '../components/person/AddInteractionSheet'
import { PlaceMapPreview } from '../components/places/PlaceMap'
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
import { formatDate } from '../utils/format'
import type { PersonWithTags, Place } from '../types'
import { getRelationshipLabel, WORKSPACES, getInteractionTypeLabel } from '../types'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<PersonWithTags | null>(null)
  const [interactions, setInteractions] = useState<InteractionWithPlaceName[]>([])
  const [lastSeenPlace, setLastSeenPlace] = useState<Place | null>(null)
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
      getPlaceById(p.lastSeenPlaceId).then(setLastSeenPlace)
    } else {
      setLastSeenPlace(null)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleFavorite = async () => {
    if (!id) return
    await toggleFavorite(id)
    load()
  }

  const handleDelete = async () => {
    if (!id || !confirm('Delete this person and all their interactions?')) return
    await deletePerson(id)
    navigate('/', { replace: true })
  }

  if (!person) {
    return (
      <div className="min-h-dvh">
        <Header title="Person" showBack />
        <div className="bg-pack-card mx-4 mt-8 h-48 animate-pulse rounded-2xl" />
      </div>
    )
  }

  const relLabel = getRelationshipLabel(person.relationshipType)
  const wsLabel = WORKSPACES.find((w) => w.value === person.workspace)?.emoji
  const metAtLabel =
    person.whereMetPlaceName || person.whereMet || person.event
      ? `Met at: ${person.whereMetPlaceName || person.whereMet || person.event}`
      : undefined

  const interactionsByPlace = interactions.reduce<
    Record<string, { name: string; placeId: string | null; items: InteractionWithPlaceName[] }>
  >((acc, i) => {
    const key = i.placeId || i.location || 'other'
    const name = i.placeName || i.location || 'No place'
    if (!acc[key]) acc[key] = { name, placeId: i.placeId, items: [] }
    acc[key].items.push(i)
    return acc
  }, {})

  const hasMemoryCues =
    person.whereMet ||
    person.whereMetPlaceName ||
    person.event ||
    person.dateMet ||
    (person.workspace === 'work' && person.company) ||
    (person.workspace === 'personal' && person.householdName) ||
    person.relationshipType

  return (
    <div className="min-h-dvh pb-8">
      <Header
        title={person.name}
        showBack
        right={
          <button onClick={handleFavorite} className="p-2">
            <Star
              className={`h-6 w-6 ${person.isFavorite ? 'text-pack-accent fill-current' : 'text-pack-text-muted'}`}
            />
          </button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 px-4 py-4"
      >
        <div className="flex flex-col items-center py-2">
          <Avatar name={person.name} color={person.profileColor} size="lg" />
          <h2 className="mt-3 max-w-full truncate px-2 text-center text-2xl font-bold">
            {person.name}
          </h2>
          <span className="text-pack-text-muted mt-1 text-sm">{wsLabel} {person.workspace}</span>
        </div>

        {/* Memory cues first */}
        {hasMemoryCues && (
          <Card className="border-pack-accent/30 !bg-pack-accent-muted/30">
            <h3 className="text-pack-accent mb-3 text-sm font-semibold tracking-wide uppercase">
              Memory Cues
            </h3>
            <div className="space-y-2.5 text-sm">
              {(person.whereMet || person.whereMetPlaceName) && (
                <p className="flex items-start gap-2 break-words">
                  <MapPin className="text-pack-accent mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Met at:</strong>{' '}
                    {person.whereMetPlaceName || person.whereMet}
                  </span>
                </p>
              )}
              {person.event && (
                <p className="flex items-center gap-2">
                  <Calendar className="text-pack-accent h-4 w-4 shrink-0" />
                  <span><strong>Event:</strong> {person.event}</span>
                </p>
              )}
              {person.dateMet && (
                <p className="flex items-center gap-2">
                  <Calendar className="text-pack-accent h-4 w-4 shrink-0" />
                  <span><strong>Date met:</strong> {formatDate(person.dateMet)}</span>
                </p>
              )}
              {person.workspace === 'work' && person.company && (
                <p className="flex items-center gap-2">
                  <Building2 className="text-pack-accent h-4 w-4 shrink-0" />
                  <span><strong>Company:</strong> {person.company}</span>
                </p>
              )}
              {person.workspace === 'personal' && person.householdName && (
                <p className="flex items-center gap-2">
                  <Home className="text-pack-accent h-4 w-4 shrink-0" />
                  <span><strong>Household:</strong> {person.householdName}</span>
                </p>
              )}
              {relLabel && (
                <p>
                  <strong>Relationship:</strong>{' '}
                  <span className="bg-pack-accent/20 text-pack-accent rounded-full px-2 py-0.5">
                    {relLabel}
                  </span>
                </p>
              )}
            </div>
          </Card>
        )}

        {(person.lastSeenAt || person.lastSeenDate || person.lastInteractionNotes || lastSeenPlace) && (
          <Card className="border-pack-border">
            <h3 className="text-pack-text-secondary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <Eye className="h-4 w-4" /> Last Seen
            </h3>
            <div className="space-y-2 text-sm">
              {(person.lastSeenPlaceName || person.lastSeenAt) && (
                <p>
                  <strong>Last Seen At:</strong>{' '}
                  {person.lastSeenPlaceName || person.lastSeenAt}
                </p>
              )}
              {person.lastSeenDate && (
                <p><strong>Last Seen Date:</strong> {formatDate(person.lastSeenDate)}</p>
              )}
              {person.lastInteractionNotes && (
                <p className="text-pack-text-secondary whitespace-pre-wrap">
                  {person.lastInteractionNotes}
                </p>
              )}
              {lastSeenPlace && (
                <div className="mt-2">
                  <PlaceMapPreview place={lastSeenPlace} />
                  {lastSeenPlace.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => navigate(`/places/${lastSeenPlace.id}`)}
                    >
                      View Place
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {(person.homeAddress || person.workLocation || person.city) && (
          <Card>
            <h3 className="text-pack-text-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
              Locations
            </h3>
            <div className="space-y-2 text-sm">
              {person.homeAddress && (
                <p className="flex items-start gap-2">
                  <Home className="text-pack-text-muted mt-0.5 h-4 w-4 shrink-0" />
                  <span><strong>Home:</strong> {person.homeAddress}</span>
                </p>
              )}
              {person.workLocation && (
                <p className="flex items-start gap-2">
                  <Building2 className="text-pack-text-muted mt-0.5 h-4 w-4 shrink-0" />
                  <span><strong>Work:</strong> {person.workLocation}</span>
                </p>
              )}
              {(person.city || person.state) && !person.homeAddress && (
                <p className="text-pack-text-muted">
                  Based in {[person.city, person.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {person.phone && (
            <a href={`tel:${person.phone}`}>
              <Button variant="secondary" size="sm">
                <Phone className="h-4 w-4" /> Call
              </Button>
            </a>
          )}
          {person.phone && (
            <a href={`sms:${person.phone}`}>
              <Button variant="secondary" size="sm">
                <MessageSquare className="h-4 w-4" /> Text
              </Button>
            </a>
          )}
          {person.email && (
            <a href={`mailto:${person.email}`}>
              <Button variant="secondary" size="sm">
                <Mail className="h-4 w-4" /> Email
              </Button>
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate(`/edit/${person.id}`)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>

        <Card>
          <h3 className="text-pack-text-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
            Contact Info
          </h3>
          <div className="space-y-2">
            {person.phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="text-pack-text-muted h-4 w-4" /> {person.phone}
              </p>
            )}
            {person.email && (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="text-pack-text-muted h-4 w-4" /> {person.email}
              </p>
            )}
            {person.jobTitle && (
              <p className="text-pack-text-secondary text-sm">{person.jobTitle}</p>
            )}
            {!person.phone && !person.email && !person.jobTitle && (
              <p className="text-pack-text-muted text-sm">No contact info — tap Edit to add</p>
            )}
          </div>
        </Card>

        {person.notes && (
          <Card>
            <h3 className="text-pack-text-secondary mb-2 text-sm font-semibold tracking-wide uppercase">
              Notes
            </h3>
            <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
          </Card>
        )}

        {person.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {person.tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-pack-text-secondary text-sm font-semibold tracking-wide uppercase">
              Interaction Timeline
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddInteraction(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <Timeline interactions={interactions} meetingLabel={metAtLabel} />
        </Card>

        {Object.keys(interactionsByPlace).length > 0 && (
          <Card>
            <h3 className="text-pack-text-secondary mb-3 text-sm font-semibold uppercase">
              By Place
            </h3>
            <div className="space-y-4">
              {Object.entries(interactionsByPlace).map(([key, group]) => (
                <div key={key}>
                  <button
                    onClick={() => group.placeId && navigate(`/places/${group.placeId}`)}
                    className={`text-pack-accent mb-2 flex items-center gap-1.5 text-sm font-semibold ${
                      group.placeId ? 'hover:underline' : ''
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    {group.name}
                  </button>
                  <div className="border-pack-border ml-2 space-y-2 border-l pl-3">
                    {group.items.map((i) => (
                      <div key={i.id} className="text-sm">
                        <p className="font-medium">
                          {formatDate(i.date)}
                          {i.interactionType && ` · ${getInteractionTypeLabel(i.interactionType)}`}
                        </p>
                        {i.notes && <p className="text-pack-text-muted">{i.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Button variant="danger" className="w-full" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Delete Person
        </Button>
      </motion.div>

      {person && (
        <AddInteractionSheet
          personId={person.id}
          personName={person.name}
          open={showAddInteraction}
          onClose={() => setShowAddInteraction(false)}
          onSaved={() => load()}
        />
      )}
    </div>
  )
}
