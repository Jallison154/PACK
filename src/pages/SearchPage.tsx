import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Filter, MapPin } from 'lucide-react'
import { SearchBar } from '../components/ui/SearchBar'
import { PersonCard } from '../components/person/PersonCard'
import { TagChip } from '../components/ui/TagChip'
import { Select } from '../components/ui/Input'
import {
  searchPeople,
  getAllTags,
  getAllCompanies,
} from '../db/repositories/people'
import { Card } from '../components/ui/Card'
import { searchPlaces, getAllPlaceNames } from '../db/repositories/places'
import { getRelationshipTypes, WORKSPACES } from '../types'
import type { PersonWithTags, SearchFilters, Place, Workspace } from '../types'

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonWithTags[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [tags, setTags] = useState<string[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [placeResults, setPlaceResults] = useState<Place[]>([])
  const [placeNames, setPlaceNames] = useState<string[]>([])

  useEffect(() => {
    const initial = (location.state as { q?: string } | null)?.q
    if (initial) setQuery(initial)
  }, [location.state])

  useEffect(() => {
    Promise.all([getAllTags(), getAllCompanies(), getAllPlaceNames()]).then(
      ([t, c, places]) => {
        setTags(t)
        setCompanies(c)
        setPlaceNames(places)
      },
    )
  }, [])

  const doSearch = useCallback(async () => {
    const [people, places] = await Promise.all([
      searchPeople(query, filters),
      query.trim() ? searchPlaces(query) : Promise.resolve([]),
    ])
    setResults(people)
    setPlaceResults(places)
  }, [query, filters])

  useEffect(() => {
    const timer = setTimeout(doSearch, 200)
    return () => clearTimeout(timer)
  }, [doSearch])

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '')
  const totalResults = results.length + placeResults.length

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="safe-top flex items-center gap-2">
        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search everything..."
            autoFocus
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`mr-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
            showFilters ? 'bg-pack-accent text-black' : 'bg-pack-card text-pack-text-secondary'
          }`}
          aria-label="Toggle filters"
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-pack-border space-y-3 overflow-hidden border-b px-4 py-3"
        >
          <Select
            label="Workspace"
            value={filters.workspace ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                workspace: (e.target.value || undefined) as Workspace | undefined,
              }))
            }
            options={[
              { value: '', label: 'All workspaces' },
              ...WORKSPACES.map((w) => ({ value: w.value, label: w.label })),
            ]}
          />
          <Select
            label="Company"
            value={filters.company ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value || undefined }))}
            options={companies.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Location"
            value={filters.location ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value || undefined }))}
            options={placeNames.map((l) => ({ value: l, label: l }))}
          />
          <Select
            label="Tag"
            value={filters.tag ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value || undefined }))}
            options={tags.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Relationship"
            value={filters.relationshipType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                relationshipType: (e.target.value || undefined) as never,
              }))
            }
            options={[
              ...getRelationshipTypes('work'),
              ...getRelationshipTypes('personal'),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
              className="bg-pack-card border-pack-border rounded-xl border px-3 py-2.5 text-sm"
              aria-label="Date from"
            />
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              className="bg-pack-card border-pack-border rounded-xl border px-3 py-2.5 text-sm"
              aria-label="Date to"
            />
          </div>
          <TagChip
            label="Favorites only"
            active={filters.favoritesOnly}
            onClick={() =>
              setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
            }
          />
        </motion.div>
      )}

      <div className="flex-1 px-4 py-4 pb-28">
        <p className="text-pack-text-muted mb-3 text-sm">
          {totalResults} {totalResults === 1 ? 'result' : 'results'}
          {totalResults > 0 && ` · ${results.length} people · ${placeResults.length} places`}
        </p>

        {placeResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-pack-text-secondary mb-2 text-sm font-semibold uppercase">Places</h3>
            <div className="space-y-2">
              {placeResults.map((place) => (
                <Card key={place.id} onClick={() => navigate(`/places/${place.id}`)}>
                  <div className="flex items-center gap-3">
                    <MapPin className="text-pack-accent h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{place.name}</p>
                      {place.city && (
                        <p className="text-pack-text-muted truncate text-sm">{place.city}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {results.map((person, i) => (
            <PersonCard key={person.id} person={person} index={i} />
          ))}
        </div>

        {results.length === 0 && placeResults.length === 0 && (query || hasActiveFilters) && (
          <p className="text-pack-text-muted py-12 text-center">
            No matches{query ? ` for "${query}"` : ''}
          </p>
        )}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="text-pack-text-secondary safe-bottom fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-pack-surface/90 px-4 py-2 text-sm backdrop-blur"
      >
        Back
      </button>
    </div>
  )
}
