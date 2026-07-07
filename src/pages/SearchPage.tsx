import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, MapPin, Building2, Calendar, X, SlidersHorizontal } from 'lucide-react'
import { MemoryPersonCard } from '../components/home/MemoryPersonCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Select, Input } from '../components/ui/Input'
import { TagChip } from '../components/ui/TagChip'
import {
  searchPeople,
  getAllCompanies,
  getAllTags,
} from '../db/repositories/people'
import { searchPlaces, getAllPlaceNames } from '../db/repositories/places'
import {
  getRelationshipTypes,
  WORKSPACES,
  WORK_RELATIONSHIP_TYPES,
  PERSONAL_RELATIONSHIP_TYPES,
} from '../types'
import {
  getRecentSearches,
  addRecentSearch,
} from '../hooks/useRecentSearches'
import type { PersonWithTags, SearchFilters, Place, Workspace, RelationshipType } from '../types'

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonWithTags[]>([])
  const [placeResults, setPlaceResults] = useState<Place[]>([])
  const [companyResults, setCompanyResults] = useState<string[]>([])
  const [eventResults, setEventResults] = useState<string[]>([])
  const [noteResults, setNoteResults] = useState<
    { personId: string; personName: string; note: string }[]
  >([])
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [placeNames, setPlaceNames] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches())

  const relationshipOptions = useMemo(() => {
    if (filters.workspace) return getRelationshipTypes(filters.workspace)
    return [...WORK_RELATIONSHIP_TYPES, ...PERSONAL_RELATIONSHIP_TYPES]
  }, [filters.workspace])

  const hasSecondaryResults =
    placeResults.length > 0 || companyResults.length > 0 || eventResults.length > 0

  useEffect(() => {
    const initial = (location.state as { q?: string } | null)?.q
    if (initial) setQuery(initial)
  }, [location.state])

  useEffect(() => {
    Promise.all([getAllCompanies(), getAllTags(), getAllPlaceNames()]).then(
      ([c, t, p]) => {
        setCompanies(c)
        setTags(t)
        setPlaceNames(p)
      },
    )
  }, [])

  const doSearch = useCallback(async () => {
    const trimmed = query.trim()
    const [people, places] = await Promise.all([
      searchPeople(query, filters),
      trimmed ? searchPlaces(query) : Promise.resolve([]),
    ])
    setResults(people)
    setPlaceResults(places)

    if (trimmed) {
      const q = trimmed.toLowerCase()
      setCompanyResults(companies.filter((c) => c.toLowerCase().includes(q)).slice(0, 8))
      const events = new Set<string>()
      const notes: { personId: string; personName: string; note: string }[] = []
      for (const p of people) {
        if (p.event?.toLowerCase().includes(q)) events.add(p.event)
        if (p.notes?.toLowerCase().includes(q)) {
          notes.push({ personId: p.id, personName: p.name, note: p.notes })
        }
      }
      setEventResults([...events].slice(0, 6))
      setNoteResults(notes.slice(0, 6))
      setRecentSearches(addRecentSearch(trimmed))
    } else {
      setCompanyResults([])
      setEventResults([])
      setNoteResults([])
    }
  }, [query, filters, companies])

  useEffect(() => {
    const timer = setTimeout(doSearch, 150)
    return () => clearTimeout(timer)
  }, [doSearch])

  return (
    <div className="min-h-dvh">
      <div className="safe-top mx-auto max-w-lg px-6 pt-8 pb-4">
        <div className="pack-elevated flex gap-2 p-2">
          <div className="relative flex-1">
            <Search className="text-pack-text-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Who are you trying to remember?"
              autoFocus
              className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-4 pr-12 pl-12 text-lg"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
              showFilters ? 'bg-pack-accent text-black' : 'pack-inset text-pack-text-muted'
            }`}
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {showFilters && (
          <div className="pack-surface mt-3 space-y-3 p-4">
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
              label="Connection"
              value={filters.relationshipType ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  relationshipType: (e.target.value || undefined) as RelationshipType | undefined,
                }))
              }
              options={[
                { value: '', label: 'Any connection' },
                ...relationshipOptions.map((r) => ({
                  value: r.value,
                  label: r.label,
                })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="From"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))
                }
              />
              <Input
                label="To"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))
                }
              />
            </div>
            <TagChip
              label="Core Pack only"
              active={filters.favoritesOnly}
              onClick={() =>
                setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
              }
            />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-6 pb-8">
        {!query && recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="text-pack-text-muted hover:text-pack-text-secondary text-sm transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {query && results.length > 0 && (
          <div>
            {results.map((person, i) => (
              <MemoryPersonCard key={person.id} person={person} index={i} />
            ))}
          </div>
        )}

        {query && noteResults.length > 0 && (
          <div className="space-y-1">
            {noteResults.map((n) => (
              <button
                key={n.personId}
                type="button"
                onClick={() => navigate(`/person/${n.personId}`)}
                className="hover:bg-pack-card-hover/50 w-full rounded-xl px-1 py-2.5 text-left transition-colors"
              >
                <p className="text-pack-text text-[15px] leading-snug">
                  <span className="font-medium">{n.personName}</span>
                  <span className="text-pack-text-muted"> · {n.note}</span>
                </p>
              </button>
            ))}
          </div>
        )}

        {query && hasSecondaryResults && (
          <div className="text-pack-text-muted space-y-2 text-sm">
            {placeResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => navigate(`/places/${place.id}`)}
                className="hover:text-pack-text-secondary flex w-full items-center gap-2 py-1 text-left transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{place.name}</span>
              </button>
            ))}
            {companyResults.map((c) => (
              <div key={c} className="flex items-center gap-2 py-1">
                <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {c}
              </div>
            ))}
            {eventResults.map((e) => (
              <div key={e} className="flex items-center gap-2 py-1">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {e}
              </div>
            ))}
          </div>
        )}

        {query &&
          results.length === 0 &&
          placeResults.length === 0 &&
          companyResults.length === 0 &&
          eventResults.length === 0 &&
          noteResults.length === 0 && (
            <EmptyState message={`Nothing found for "${query}"`} />
          )}

        {!query && recentSearches.length === 0 && (
          <p className="text-pack-text-muted pt-4 text-center text-sm">
            Names, places, notes — whatever you remember.
          </p>
        )}
      </div>
    </div>
  )
}
