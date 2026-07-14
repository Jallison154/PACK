import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobilePageShell } from '../components/layout/MobilePageShell'
import { Search, Users, SlidersHorizontal, X, UserPlus } from 'lucide-react'
import { PackMemberRow } from '../components/pack/PackMemberRow'
import { AlphabetIndex } from '../components/pack/AlphabetIndex'
import { PersonDetailSheet } from '../components/person/PersonDetailSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import {
  listPackMembers,
  type PackMemberSort,
  type PackMemberView,
} from '../db/repositories/people'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePackDataRefresh } from '../hooks/usePackDataRefresh'
import { useIsDesktop, DESKTOP_BREAKPOINT } from '../components/ui/WorkspaceToggle'
import { groupByLetter } from '../utils/groupByLetter'
import type { PersonWithTags, Workspace } from '../types'

const VIEW_OPTIONS: { value: PackMemberView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'recent', label: 'Recent' },
  { value: 'core', label: 'Core' },
]

const WORKSPACE_OPTIONS: { value: Workspace | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
]

const SORT_OPTIONS: { value: PackMemberSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'recently_seen', label: 'Recently Seen' },
  { value: 'last_interaction', label: 'Last Interaction' },
]

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-pack-accent/15 text-pack-accent'
          : 'text-pack-text-muted hover:bg-pack-card-hover/50 hover:text-pack-text-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export function MyPackPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop(DESKTOP_BREAKPOINT)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<PackMemberView>('all')
  const [workspace, setWorkspace] = useState<Workspace | 'all'>('all')
  const [sort, setSort] = useState<PackMemberSort>('name')
  const [showOptions, setShowOptions] = useState(false)
  const [people, setPeople] = useState<PersonWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const listScrollRef = useRef<HTMLDivElement | null>(null)

  const debouncedQuery = useDebouncedValue(query, 200)

  const load = useCallback(async () => {
    setLoading(true)
    const ws = workspace === 'all' ? undefined : workspace
    const members = await listPackMembers({
      query: debouncedQuery,
      workspace: ws,
      view,
      sort,
    })
    setPeople(members)
    setLoading(false)
  }, [debouncedQuery, workspace, view, sort])

  useEffect(() => {
    void load()
  }, [load])

  usePackDataRefresh(load)

  const useAlphaGroups = sort === 'name' && !debouncedQuery.trim() && !isDesktop
  const groups = useMemo(
    () => (useAlphaGroups ? groupByLetter(people) : []),
    [people, useAlphaGroups],
  )
  const letters = useMemo(() => groups.map((g) => g.letter), [groups])
  const coreCount = useMemo(
    () => people.filter((person) => person.isFavorite).length,
    [people],
  )

  const scrollToLetter = (letter: string) => {
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const emptyMessage =
    view === 'core'
      ? 'No one in your Core Pack yet.'
      : view === 'recent'
        ? 'No recent people yet.'
        : debouncedQuery
          ? `No one matches "${debouncedQuery}"`
          : 'Your Pack is just getting started.'

  const filters = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VIEW_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={view === opt.value}
            onClick={() => setView(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span className="text-pack-text-muted/70 mr-1 text-[11px] tracking-wide uppercase">
          Space
        </span>
        {WORKSPACE_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={workspace === opt.value}
            onClick={() => setWorkspace(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span className="text-pack-text-muted/70 mr-1 text-[11px] tracking-wide uppercase">
          Sort
        </span>
        {SORT_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={sort === opt.value}
            onClick={() => {
              setSort(opt.value)
              setShowOptions(false)
            }}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>
    </div>
  )

  return (
    <MobilePageShell top={false} padded={false}>
      <div className="page-top-shell page-px sticky-below-notch pb-3">
        <div className="mx-auto w-full max-w-lg md:max-w-5xl xl:max-w-[1500px]">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-pack-text text-2xl font-semibold tracking-tight">My Pack</h1>
              <p className="text-pack-text-muted mt-0.5 text-sm">
                {loading
                  ? 'Loading…'
                  : people.length === 0
                    ? 'People you meet live here.'
                    : `${people.length} ${people.length === 1 ? 'person' : 'people'}${
                        view === 'all' && coreCount > 0 ? ` · ${coreCount} Core` : ''
                      }`}
              </p>
            </div>
            <Button
              size="sm"
              className="hidden shrink-0 sm:inline-flex"
              onClick={() => navigate('/add')}
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="relative">
            <Search className="text-pack-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find someone in your Pack…"
              className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-3.5 pr-20 pl-11 text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-12 -translate-y-1/2 lg:right-4"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors lg:hidden ${
                showOptions ? 'text-pack-accent' : 'text-pack-text-muted'
              }`}
              aria-label="Sort and filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile: collapsible filters */}
          {showOptions && <div className="mt-3 lg:hidden">{filters}</div>}

          {/* Desktop: always-visible filter bar */}
          <div className="border-pack-border mt-4 hidden rounded-2xl border bg-[#171717] px-4 py-3 lg:block">
            {filters}
          </div>
        </div>
      </div>

      <div
        ref={listScrollRef}
        className="page-px relative mx-auto w-full max-w-lg pb-8 md:max-w-5xl xl:max-w-[1500px]"
      >
        {loading ? (
          isDesktop ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )
        ) : people.length === 0 ? (
          <div className="pt-12">
            <EmptyState
              message={emptyMessage}
              hint="Add someone from Home to grow your Pack."
              icon={<Users className="h-7 w-7" />}
              action={
                <Button onClick={() => navigate('/add')}>
                  <UserPlus className="h-4 w-4" />
                  Add to Pack
                </Button>
              }
            />
          </div>
        ) : isDesktop ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {people.map((person) => (
              <PackMemberRow
                key={person.id}
                person={person}
                variant="card"
                selected={selectedPersonId === person.id}
                onSelect={(member) => setSelectedPersonId(member.id)}
              />
            ))}
          </div>
        ) : useAlphaGroups ? (
          <>
            <div className="border-pack-border overflow-hidden rounded-2xl border bg-[#171717]">
              {groups.map((group) => (
                <section
                  key={group.letter}
                  ref={(el) => {
                    sectionRefs.current[group.letter] = el
                  }}
                >
                  <h2 className="text-pack-text-muted/60 bg-[#0A0A0A]/40 px-4 py-2 text-[11px]">
                    {group.letter}
                  </h2>
                  {group.people.map((person, i) => (
                    <PackMemberRow
                      key={person.id}
                      person={person}
                      showDivider={i < group.people.length - 1}
                      selected={selectedPersonId === person.id}
                      onSelect={(member) => setSelectedPersonId(member.id)}
                    />
                  ))}
                </section>
              ))}
            </div>
            <AlphabetIndex letters={letters} onSelect={scrollToLetter} />
          </>
        ) : (
          <div className="border-pack-border overflow-hidden rounded-2xl border bg-[#171717]">
            {people.map((person, i) => (
              <PackMemberRow
                key={person.id}
                person={person}
                showDivider={i < people.length - 1}
                selected={selectedPersonId === person.id}
                onSelect={(member) => setSelectedPersonId(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      <PersonDetailSheet
        personId={selectedPersonId}
        open={Boolean(selectedPersonId)}
        onClose={() => setSelectedPersonId(null)}
        onChanged={() => void load()}
        onDeleted={() => {
          setSelectedPersonId(null)
          void load()
        }}
      />
    </MobilePageShell>
  )
}
