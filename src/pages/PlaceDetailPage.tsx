import { MobilePageShell } from '../components/layout/MobilePageShell'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Users, Eye, Pencil, Trash2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PersonCard } from '../components/person/PersonCard'
import { PackMapPreview } from '../components/places/PackMap'
import {
  getPlaceStats,
  getPeopleMetAtPlace,
  getPeopleLastSeenAtPlace,
  getInteractionsAtPlace,
  togglePlaceFavorite,
  deletePlace,
} from '../db/repositories/places'
import { formatLocation, formatDate } from '../utils/format'
import { getPlaceCategoryLabel } from '../types'
import { getInteractionTypeLabel } from '../types'
import type { PlaceWithStats, PersonWithTags, InteractionWithPerson } from '../types'

export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [place, setPlace] = useState<PlaceWithStats | null>(null)
  const [metHere, setMetHere] = useState<PersonWithTags[]>([])
  const [lastSeen, setLastSeen] = useState<PersonWithTags[]>([])
  const [interactions, setInteractions] = useState<InteractionWithPerson[]>([])
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    if (!id) return
    const [stats, met, seen, ints] = await Promise.all([
      getPlaceStats(id),
      getPeopleMetAtPlace(id),
      getPeopleLastSeenAtPlace(id),
      getInteractionsAtPlace(id),
    ])
    setPlace(stats)
    setMetHere(met)
    setLastSeen(seen)
    setInteractions(ints)
  }

  useEffect(() => {
    void load()
  }, [id])

  const handleFavorite = async () => {
    if (!id) return
    await togglePlaceFavorite(id)
    void load()
  }

  const handleDelete = async () => {
    if (!id || !place) return
    const confirmed = window.confirm(
      `Delete "${place.name}"? Pack Members will keep their history, but this place pin will be removed.`,
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await deletePlace(id)
      navigate('/places', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  if (!place) {
    return (
      <MobilePageShell top={false} padded={false}>
        <Header title="Place" showBack />
        <div className="page-px mt-6"><div className="bg-pack-card h-48 animate-pulse rounded-2xl" /></div>
      </MobilePageShell>
    )
  }

  return (
    <MobilePageShell top={false} padded={false}>
      <Header
        title={place.name}
        showBack
        right={
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleFavorite} className="p-2" aria-label="Favorite">
              <Star
                className={`h-6 w-6 ${place.isFavorite ? 'text-pack-accent fill-current' : 'text-pack-text-muted'}`}
              />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/places/${id}/edit`)}
              className="text-pack-text-muted hover:text-pack-text p-2"
              aria-label="Edit place"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="page-px mx-auto max-w-lg space-y-4 pt-6">
        <PackMapPreview place={place} height="200px" />

        <Card>
          <div className="space-y-2 text-sm">
            {place.category && (
              <p>
                <span className="text-pack-text-muted">Category:</span>{' '}
                {getPlaceCategoryLabel(place.category)}
              </p>
            )}
            {place.address && <p>{place.address}</p>}
            {formatLocation(place.city, place.state) && (
              <p className="text-pack-text-muted">{formatLocation(place.city, place.state)}</p>
            )}
            {place.notes && (
              <p className="text-pack-text-secondary whitespace-pre-wrap">{place.notes}</p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Card className="!p-3">
            <p className="text-xl font-bold">{place.metCount}</p>
            <p className="text-pack-text-muted text-xs">Met here</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xl font-bold">{place.lastSeenCount}</p>
            <p className="text-pack-text-muted text-xs">Last seen</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xl font-bold">{place.interactionCount}</p>
            <p className="text-pack-text-muted text-xs">Trail entries</p>
          </Card>
        </div>

        {metHere.length > 0 && (
          <div>
            <h3 className="text-pack-text-secondary mb-3 flex items-center gap-2 text-sm font-semibold uppercase">
              <Users className="h-4 w-4" /> Pack Members Met Here
            </h3>
            <div className="space-y-2">
              {metHere.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}

        {lastSeen.length > 0 && (
          <div>
            <h3 className="text-pack-text-secondary mb-3 flex items-center gap-2 text-sm font-semibold uppercase">
              <Eye className="h-4 w-4" /> Last Seen Here
            </h3>
            <div className="space-y-2">
              {lastSeen.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </div>
        )}

        <Card>
          <h3 className="text-pack-text-secondary mb-3 text-sm font-semibold uppercase">
            Memory Trail
          </h3>
          {interactions.length === 0 ? (
            <p className="text-pack-text-muted text-sm">No trails at this place yet</p>
          ) : (
            <div className="space-y-3">
              {interactions.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => navigate(`/person/${i.personId}`)}
                  className="hover:bg-pack-card-hover block w-full rounded-xl p-2 text-left"
                >
                  <p className="font-medium">{i.personName}</p>
                  <p className="text-pack-text-muted text-sm">
                    {formatDate(i.date)}
                    {i.interactionType && ` · ${getInteractionTypeLabel(i.interactionType)}`}
                  </p>
                  {i.notes && <p className="text-pack-text-secondary text-sm">{i.notes}</p>}
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/places/${id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit Place
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void handleDelete()} loading={deleting}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
    </MobilePageShell>
  )
}
