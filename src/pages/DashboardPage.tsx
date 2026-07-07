import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Building2, Star, CalendarClock } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PersonCard } from '../components/person/PersonCard'
import { QuickAddHero } from '../components/dashboard/QuickAddHero'
import { WeekSummary } from '../components/dashboard/WeekSummary'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { useWorkspace } from '../context/WorkspaceContext'
import {
  getWeeklySummary,
  getRecentlyAdded,
  getUpcomingFollowUps,
  getRecentCompanies,
  getRecentLocations,
  getFavoriteByWorkspace,
} from '../db/repositories/dashboard'
import { formatDate } from '../utils/format'
import type { PersonWithTags, InteractionWithPerson } from '../types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { workspace, setWorkspace } = useWorkspace()
  const [weekly, setWeekly] = useState<Awaited<ReturnType<typeof getWeeklySummary>> | null>(null)
  const [recent, setRecent] = useState<PersonWithTags[]>([])
  const [followUps, setFollowUps] = useState<InteractionWithPerson[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [favorites, setFavorites] = useState<PersonWithTags[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getWeeklySummary(workspace),
      getRecentlyAdded(workspace),
      getUpcomingFollowUps(workspace),
      getRecentCompanies(workspace),
      getRecentLocations(workspace),
      getFavoriteByWorkspace(workspace),
    ]).then(([week, rec, fu, comp, loc, fav]) => {
      setWeekly(week)
      setRecent(rec.slice(0, 6))
      setFollowUps(fu.slice(0, 5))
      setCompanies(comp.slice(0, 6))
      setLocations(loc.slice(0, 6))
      setFavorites(fav.slice(0, 4))
      setLoading(false)
    })
  }, [workspace])

  return (
    <div className="min-h-dvh">
      <Header title="Stats" />

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-4">
        <WorkspaceToggle value={workspace} onChange={setWorkspace} />

        <QuickAddHero />

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
          <SectionHeader>Recent People</SectionHeader>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-pack-card h-14 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <Card>
              <EmptyState message="No people yet" hint="Use Quick Add to capture someone you met" />
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.map((p, i) => (
                <PersonCard key={p.id} person={p} index={i} compact />
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <SectionHeader>Follow-ups</SectionHeader>
            <Card padding="sm" className="min-h-[120px]">
              {followUps.length === 0 ? (
                <EmptyState
                  message="No follow-ups yet"
                  icon={<CalendarClock className="h-5 w-5" />}
                />
              ) : (
                <div className="divide-pack-border/60 divide-y">
                  {followUps.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => navigate(`/person/${f.personId}`)}
                      className="hover:bg-pack-card-hover flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2.5 text-left transition-colors"
                    >
                      <span className="text-pack-text truncate text-sm font-medium">
                        {f.personName}
                      </span>
                      <span className="text-pack-accent shrink-0 text-xs">
                        {formatDate(f.nextFollowUp)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionHeader>
              {workspace === 'work' ? 'Recent Companies & Places' : 'Saved'}
            </SectionHeader>
            <Card padding="sm" className="min-h-[120px]">
              {workspace === 'work' ? (
                companies.length === 0 && locations.length === 0 ? (
                  <EmptyState
                    message="No recent places yet"
                    hint="Places appear as you add people and interactions"
                    icon={<MapPin className="h-5 w-5" />}
                  />
                ) : (
                  <div className="space-y-3">
                    {companies.length > 0 && (
                      <div>
                        <p className="text-pack-text-muted mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                          <Building2 className="h-3.5 w-3.5" /> Companies
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {companies.map((c) => (
                            <span
                              key={c}
                              className="bg-pack-surface text-pack-text-secondary border-pack-border/60 rounded-lg border px-2.5 py-1 text-xs"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {locations.length > 0 && (
                      <div>
                        <p className="text-pack-text-muted mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                          <MapPin className="h-3.5 w-3.5" /> Places
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {locations.map((l) => (
                            <span
                              key={l}
                              className="bg-pack-surface text-pack-text-secondary border-pack-border/60 rounded-lg border px-2.5 py-1 text-xs"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : favorites.length === 0 ? (
                <EmptyState
                  message="No saved people yet"
                  hint="Star someone from their profile"
                  icon={<Star className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-2">
                  {favorites.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => navigate(`/person/${p.id}`)}
                      className="hover:bg-pack-card-hover flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left"
                    >
                      <Star className="text-pack-accent h-3.5 w-3.5 fill-current" />
                      <span className="text-pack-text truncate text-sm font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
