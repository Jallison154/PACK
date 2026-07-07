import { useState, useEffect, useCallback } from 'react'
import { CalendarClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/ui/SearchBar'
import { FAB } from '../components/ui/FAB'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PackLogo } from '../components/brand/PackLogo'
import { PersonCard } from '../components/person/PersonCard'
import { QuickAddHero } from '../components/dashboard/QuickAddHero'
import { WeekSummary } from '../components/dashboard/WeekSummary'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { getRecentPeople } from '../db/repositories/people'
import {
  getWeeklySummary,
  getFavoriteByWorkspace,
  getUpcomingFollowUps,
} from '../db/repositories/dashboard'
import { useWorkspace } from '../context/WorkspaceContext'
import { WORKSPACES } from '../types'
import { formatDate } from '../utils/format'
import type { PersonWithTags, InteractionWithPerson } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const { workspace, setWorkspace } = useWorkspace()
  const [search, setSearch] = useState('')
  const [people, setPeople] = useState<PersonWithTags[]>([])
  const [favorites, setFavorites] = useState<PersonWithTags[]>([])
  const [followUps, setFollowUps] = useState<InteractionWithPerson[]>([])
  const [weekly, setWeekly] = useState<Awaited<ReturnType<typeof getWeeklySummary>> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPeople = useCallback(async () => {
    setLoading(true)
    const [data, fav, fu, week] = await Promise.all([
      getRecentPeople(workspace, 20),
      getFavoriteByWorkspace(workspace),
      getUpcomingFollowUps(workspace),
      getWeeklySummary(workspace),
    ])
    setPeople(data)
    setFavorites(fav.slice(0, 5))
    setFollowUps(fu.slice(0, 4))
    setWeekly(week)
    setLoading(false)
  }, [workspace])

  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  const wsLabel = WORKSPACES.find((w) => w.value === workspace)?.label ?? workspace
  const recent = people.filter((p) => !p.isFavorite).slice(0, 8)

  return (
    <div className="min-h-dvh">
      <header className="border-pack-border/60 bg-pack-bg safe-top border-b px-4 pt-3 pb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <PackLogo href="/" size="sm" />
          <WorkspaceToggle value={workspace} onChange={setWorkspace} size="sm" />
        </div>
        <SearchBar
          embedded
          value={search}
          onChange={setSearch}
          onFocus={() => navigate('/search', { state: { q: search } })}
          placeholder={`Search ${wsLabel.toLowerCase()} contacts...`}
        />
      </header>

      <div className="space-y-5 px-4 py-4">
        <QuickAddHero compact />

        <section>
          <SectionHeader>This Week</SectionHeader>
          <WeekSummary
            peopleAdded={weekly?.peopleAdded ?? 0}
            newCompanies={weekly?.newCompanies ?? 0}
            newLocations={weekly?.newLocations ?? 0}
            newEvents={weekly?.newEvents ?? 0}
            workspace={workspace}
          />
        </section>

        <section>
          <SectionHeader>Recent</SectionHeader>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-pack-card h-14 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : recent.length === 0 && favorites.length === 0 ? (
            <Card>
              <EmptyState
                message="Add your first person to start building your Pack"
                hint="Tap Quick Add above"
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {recent.map((person, i) => (
                <PersonCard key={person.id} person={person} index={i} compact />
              ))}
            </div>
          )}
        </section>

        {favorites.length > 0 && (
          <section>
            <SectionHeader>Saved</SectionHeader>
            <div className="space-y-2">
              {favorites.map((person, i) => (
                <PersonCard key={person.id} person={person} index={i} compact />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader>Follow-ups</SectionHeader>
          <Card padding="sm">
            {followUps.length === 0 ? (
              <EmptyState message="No follow-ups yet" icon={<CalendarClock className="h-5 w-5" />} />
            ) : (
              <div className="divide-pack-border/60 divide-y">
                {followUps.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => navigate(`/person/${f.personId}`)}
                    className="hover:bg-pack-card-hover flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2.5 text-left transition-colors"
                  >
                    <span className="text-pack-text truncate text-sm font-medium">{f.personName}</span>
                    <span className="text-pack-accent shrink-0 text-xs">{formatDate(f.nextFollowUp)}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      <FAB />
    </div>
  )
}
