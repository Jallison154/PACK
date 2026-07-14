import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { MobilePageShell } from '../components/layout/MobilePageShell'
import { Search, Users, SlidersHorizontal, X } from 'lucide-react'
import { PackMemberRow } from '../components/pack/PackMemberRow'
import { AlphabetIndex } from '../components/pack/AlphabetIndex'
import { PersonDetailSheet } from '../components/person/PersonDetailSheet'
import { EmptyState } from '../components/ui/EmptyState'
import {
  listPackMembers,
  type PackMemberSort,
  type PackMemberView,
} from '../db/repositories/people'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePackDataRefresh } from '../hooks/usePackDataRefresh'
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

export function MyPackPage() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<PackMemberView>('all')
  const [workspace, setWorkspace] = useState<Workspace | 'all'>('all')
  const [sort, setSort] = useState<PackMemberSort>('name')
  const [showOptions, setShowOptions] = useState(false)
  const [people, setPeople] = useState<PersonWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

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
    load()
  }, [load])

  usePackDataRefresh(load)

  const useAlphaGroups = sort === 'name' && !debouncedQuery.trim()
  const groups = useMemo(
    () => (useAlphaGroups ? groupByLetter(people) : []),
    [people, useAlphaGroups],
  )
  const letters = useMemo(() => groups.map((g) => g.letter), [groups])

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

  return (
    <MobilePageShell top={false} padded={false}>
      <div className="page-top-shell page-px sticky-below-notch pb-3">
        <div className="relative">
          <Search className="text-pack-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone..."
            className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-3.5 pr-20 pl-11 text-base"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-12 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={`absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
              showOptions ? 'text-pack-accent' : 'text-pack-text-muted'
            }`}
            aria-label="Sort and filter"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {showOptions && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setView(opt.value)}
                  className={`text-sm transition-colors ${
                    view === opt.value
                      ? 'text-pack-text font-medium'
                      : 'text-pack-text-muted hover:text-pack-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {WORKSPACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWorkspace(opt.value)}
                  className={`text-xs transition-colors ${
                    workspace === opt.value
                      ? 'text-pack-text-secondary'
                      : 'text-pack-text-muted/70 hover:text-pack-text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSort(opt.value)
                    setShowOptions(false)
                  }}
                  className={`text-xs transition-colors ${
                    sort === opt.value
                      ? 'text-pack-text-secondary'
                      : 'text-pack-text-muted/70 hover:text-pack-text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="page-px relative mx-auto max-w-lg pb-4">
        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="pt-12">
            <EmptyState
              message={emptyMessage}
              hint="Add someone from Home to grow your Pack."
              icon={<Users className="h-7 w-7" />}
            />
          </div>
        ) : useAlphaGroups ? (
          <>
            {groups.map((group) => (
              <section
                key={group.letter}
                ref={(el) => {
                  sectionRefs.current[group.letter] = el
                }}
              >
                <h2 className="text-pack-text-muted/60 px-1 py-2 text-[11px]">{group.letter}</h2>
                {group.people.map((person, i) => (
                  <PackMemberRow
                    key={person.id}
                    person={person}
                    showDivider={i < group.people.length - 1}
                    onSelect={(member) => setSelectedPersonId(member.id)}
                  />
                ))}
              </section>
            ))}
            <AlphabetIndex letters={letters} onSelect={scrollToLetter} />
          </>
        ) : (
          <div>
            {people.map((person, i) => (
              <PackMemberRow
                key={person.id}
                person={person}
                showDivider={i < people.length - 1}
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
