import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
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
import type { PersonWithTags, Place } from '../types'

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
    if (!id || !confirm('Remove this person and their memories?')) return
    await deletePerson(id)
    navigate('/', { replace: true })
  }

  if (!person) {
    return (
      <div className="min-h-dvh px-6 pt-6">
        <div className="pack-elevated h-64 animate-pulse" />
      </div>
    )
  }

  const whereMet = person.whereMetPlaceName || person.whereMet || person.event
  const lastSeen = person.lastSeenPlaceName || person.lastSeenAt
  const contextLine = [whereMet && `Met at ${whereMet}`, lastSeen && `Last seen ${lastSeen}`]
    .filter(Boolean)
    .join(' · ')
  const metAtLabel = whereMet ? `Met at ${whereMet}` : undefined

  return (
    <div className="min-h-dvh pb-12">
      <div className="safe-top flex items-center justify-between px-4 py-3">
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
          onClick={handleFavorite}
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
        className="mx-auto max-w-lg px-6"
      >
        <div className="mb-8 text-center">
          <Avatar name={person.name} color={person.profileColor} size="lg" />
          <h1 className="text-pack-text mt-5 text-3xl font-semibold tracking-tight">
            {person.name}
          </h1>
          {person.company && (
            <p className="text-pack-text-secondary mt-1.5 text-base">{person.company}</p>
          )}
          {contextLine && (
            <p className="text-pack-text-muted mt-2 text-sm leading-relaxed">{contextLine}</p>
          )}
        </div>

        <Button className="mb-10 w-full" onClick={() => setShowAddInteraction(true)}>
          <Plus className="h-4 w-4" /> Add a memory
        </Button>

        <div className="mb-10">
          <Timeline interactions={interactions} meetingLabel={metAtLabel} />
        </div>

        {person.notes && (
          <p className="text-pack-text-secondary mb-10 text-sm leading-relaxed whitespace-pre-wrap">
            {person.notes}
          </p>
        )}

        {lastSeenPlace && (
          <div className="mb-10">
            <PlaceMapPreview place={lastSeenPlace} />
          </div>
        )}

        {(person.phone || person.email || person.homeAddress || person.workLocation) && (
          <div className="text-pack-text-secondary mb-10 space-y-2.5 text-sm">
            {person.phone && (
              <a href={`tel:${person.phone}`} className="text-pack-text flex items-center gap-3">
                <Phone className="text-pack-text-muted h-4 w-4" /> {person.phone}
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="text-pack-text flex items-center gap-3">
                <Mail className="text-pack-text-muted h-4 w-4" /> {person.email}
              </a>
            )}
            {person.homeAddress && (
              <p className="text-pack-text flex items-start gap-3">
                <MapPin className="text-pack-text-muted mt-0.5 h-4 w-4 shrink-0" />
                {person.homeAddress}
              </p>
            )}
            {person.workLocation && (
              <p className="flex items-start gap-3">
                <MapPin className="text-pack-text-muted mt-0.5 h-4 w-4 shrink-0" />
                {person.workLocation}
              </p>
            )}
          </div>
        )}

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
            onClick={handleDelete}
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
        onSaved={() => load()}
      />
    </div>
  )
}
