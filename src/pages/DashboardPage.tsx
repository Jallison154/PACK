import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  MapPin,
  Calendar,
  Star,
  Plus,
  Home,
  UserPlus,
} from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { WorkspaceToggle, useIsDesktop } from '../components/ui/WorkspaceToggle'
import { PersonCard } from '../components/person/PersonCard'
import { useWorkspace } from '../context/WorkspaceContext'
import {
  getWorkDashboardStats,
  getPersonalDashboardStats,
  getPeopleMetThisWeek,
  getRecentCompanies,
  getRecentLocations,
  getUpcomingFollowUps,
  getRecentInteractions,
  getFavoriteByWorkspace,
  getRecentlyAdded,
  getPeopleByRelationship,
  getRecentNotes,
  getWeeklySummary,
} from '../db/repositories/dashboard'
import { getAllHouseholds } from '../db/repositories/households'
import { formatDate } from '../utils/format'
import type {
  WorkDashboardStats,
  PersonalDashboardStats,
  PersonWithTags,
  InteractionWithPerson,
  HouseholdWithMembers,
} from '../types'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="!p-4">
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-pack-text-muted text-xs">{label}</p>
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-pack-text-secondary mb-3 text-sm font-semibold tracking-wide uppercase">
      {children}
    </h3>
  )
}

function WorkDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<WorkDashboardStats | null>(null)
  const [metThisWeek, setMetThisWeek] = useState<PersonWithTags[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [followUps, setFollowUps] = useState<InteractionWithPerson[]>([])
  const [interactions, setInteractions] = useState<InteractionWithPerson[]>([])
  const [favorites, setFavorites] = useState<PersonWithTags[]>([])

  useEffect(() => {
    Promise.all([
      getWorkDashboardStats(),
      getPeopleMetThisWeek('work'),
      getRecentCompanies('work'),
      getRecentLocations('work'),
      getUpcomingFollowUps('work'),
      getRecentInteractions('work'),
      getFavoriteByWorkspace('work'),
    ]).then(([s, met, comp, loc, fu, ints, fav]) => {
      setStats(s)
      setMetThisWeek(met)
      setCompanies(comp)
      setLocations(loc)
      setFollowUps(fu)
      setInteractions(ints)
      setFavorites(fav)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Work Contacts" value={stats?.totalContacts ?? 0} icon={Users} color="#F7941D" />
        <StatCard label="Companies" value={stats?.companies ?? 0} icon={Building2} color="#3B82F6" />
        <StatCard label="Events" value={stats?.events ?? 0} icon={Calendar} color="#A855F7" />
        <StatCard label="Locations" value={stats?.locations ?? 0} icon={MapPin} color="#14B8A6" />
        <StatCard label="Added This Week" value={stats?.addedThisWeek ?? 0} icon={UserPlus} color="#22C55E" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>People Met This Week</SectionTitle>
          {metThisWeek.length === 0 ? (
            <p className="text-pack-text-muted text-sm">No new contacts this week</p>
          ) : (
            <div className="space-y-2">
              {metThisWeek.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/person/${p.id}`)}
                  className="hover:bg-pack-card-hover flex w-full items-center gap-3 rounded-xl p-2 text-left"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  {p.company && (
                    <span className="text-pack-text-muted truncate text-sm">{p.company}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Upcoming Follow-Ups</SectionTitle>
          {followUps.length === 0 ? (
            <p className="text-pack-text-muted text-sm">No follow-ups scheduled</p>
          ) : (
            <div className="space-y-2">
              {followUps.map((f) => (
                <button
                  key={f.id}
                  onClick={() => navigate(`/person/${f.personId}`)}
                  className="hover:bg-pack-card-hover flex w-full justify-between rounded-xl p-2 text-left"
                >
                  <span className="font-medium">{f.personName}</span>
                  <span className="text-pack-accent text-sm">{formatDate(f.nextFollowUp)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Recent Companies</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <span key={c} className="bg-pack-accent-muted text-pack-accent rounded-full px-3 py-1 text-sm">
                {c}
              </span>
            ))}
            {companies.length === 0 && (
              <p className="text-pack-text-muted text-sm">No companies yet</p>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle>Recent Locations</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {locations.map((l) => (
              <span key={l} className="bg-pack-card border-pack-border rounded-full border px-3 py-1 text-sm">
                {l}
              </span>
            ))}
            {locations.length === 0 && (
              <p className="text-pack-text-muted text-sm">No locations yet</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Recent Interactions</SectionTitle>
          {interactions.length === 0 ? (
            <p className="text-pack-text-muted text-sm">No interactions yet</p>
          ) : (
            <div className="space-y-2">
              {interactions.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(`/person/${i.personId}`)}
                  className="hover:bg-pack-card-hover flex w-full items-start justify-between gap-2 rounded-xl p-2 text-left"
                >
                  <div>
                    <span className="font-medium">{i.personName}</span>
                    <p className="text-pack-text-muted text-sm">{i.notes || i.location || 'Interaction'}</p>
                  </div>
                  <span className="text-pack-text-muted shrink-0 text-xs">{formatDate(i.date)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {favorites.length > 0 && (
          <Card className="lg:col-span-2">
            <SectionTitle>Favorite Work Contacts</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {favorites.map((p, i) => (
                <PersonCard key={p.id} person={p} index={i} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function PersonalDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PersonalDashboardStats | null>(null)
  const [recent, setRecent] = useState<PersonWithTags[]>([])
  const [favorites, setFavorites] = useState<PersonWithTags[]>([])
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([])
  const [neighbors, setNeighbors] = useState<PersonWithTags[]>([])
  const [family, setFamily] = useState<PersonWithTags[]>([])
  const [friends, setFriends] = useState<PersonWithTags[]>([])
  const [notes, setNotes] = useState<{ personId: string; personName: string; note: string }[]>([])

  useEffect(() => {
    Promise.all([
      getPersonalDashboardStats(),
      getRecentlyAdded('personal'),
      getFavoriteByWorkspace('personal'),
      getAllHouseholds(),
      getPeopleByRelationship('personal', 'neighbor'),
      getPeopleByRelationship('personal', 'family'),
      getPeopleByRelationship('personal', 'friend'),
      getRecentNotes('personal'),
    ]).then(([s, rec, fav, hh, neigh, fam, fr, n]) => {
      setStats(s)
      setRecent(rec)
      setFavorites(fav)
      setHouseholds(hh)
      setNeighbors(neigh)
      setFamily(fam)
      setFriends(fr)
      setNotes(n)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Personal Contacts" value={stats?.totalContacts ?? 0} icon={Users} color="#F7941D" />
        <StatCard label="Households" value={stats?.households ?? 0} icon={Home} color="#3B82F6" />
        <StatCard label="Neighborhoods" value={stats?.neighborhoods ?? 0} icon={MapPin} color="#14B8A6" />
        <StatCard label="Favorites" value={stats?.favorites ?? 0} icon={Star} color="#F59E0B" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Recently Added</SectionTitle>
          {recent.length === 0 ? (
            <p className="text-pack-text-muted text-sm">No contacts yet</p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 5).map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Favorite People</SectionTitle>
          {favorites.length === 0 ? (
            <p className="text-pack-text-muted text-sm">Star people to see them here</p>
          ) : (
            <div className="space-y-2">
              {favorites.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>Household Groups</SectionTitle>
          {households.length === 0 ? (
            <p className="text-pack-text-muted text-sm">Group family & neighbors into households</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {households.map((hh) => (
                <div key={hh.id} className="bg-pack-bg rounded-xl p-3">
                  <h4 className="font-semibold">{hh.name}</h4>
                  {hh.pets && <p className="text-pack-text-muted text-sm">🐾 {hh.pets}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hh.members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/person/${m.id}`)}
                        className="bg-pack-accent-muted text-pack-accent rounded-full px-2 py-0.5 text-xs"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {[{ label: 'Neighbors', data: neighbors }, { label: 'Family', data: family }, { label: 'Friends', data: friends }].map(
          ({ label, data }) =>
            data.length > 0 && (
              <Card key={label}>
                <SectionTitle>{label}</SectionTitle>
                <div className="space-y-1">
                  {data.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/person/${p.id}`)}
                      className="hover:bg-pack-card-hover block w-full rounded-lg p-2 text-left font-medium"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </Card>
            ),
        )}

        {notes.length > 0 && (
          <Card className="lg:col-span-2">
            <SectionTitle>Recent Notes</SectionTitle>
            <div className="space-y-2">
              {notes.map((n) => (
                <button
                  key={n.personId}
                  onClick={() => navigate(`/person/${n.personId}`)}
                  className="hover:bg-pack-card-hover block w-full rounded-xl p-2 text-left"
                >
                  <span className="font-medium">{n.personName}</span>
                  <p className="text-pack-text-muted line-clamp-2 text-sm">{n.note}</p>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function DesktopWeeklyWidgets() {
  const navigate = useNavigate()
  const { workspace } = useWorkspace()
  const [weekly, setWeekly] = useState<Awaited<ReturnType<typeof getWeeklySummary>> | null>(null)
  const [interactions, setInteractions] = useState<InteractionWithPerson[]>([])
  const [followUps, setFollowUps] = useState<InteractionWithPerson[]>([])
  const [favorites, setFavorites] = useState<PersonWithTags[]>([])

  useEffect(() => {
    Promise.all([
      getWeeklySummary(workspace),
      getRecentInteractions(workspace, 8),
      getUpcomingFollowUps(workspace),
      getFavoriteByWorkspace(workspace),
    ]).then(([w, ints, fu, fav]) => {
      setWeekly(w)
      setInteractions(ints)
      setFollowUps(fu)
      setFavorites(fav)
    })
  }, [workspace])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <SectionTitle>This Week</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-bold">{weekly?.peopleAdded ?? 0}</p>
            <p className="text-pack-text-muted text-xs">People Added</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{weekly?.newCompanies ?? 0}</p>
            <p className="text-pack-text-muted text-xs">New Companies</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{weekly?.newLocations ?? 0}</p>
            <p className="text-pack-text-muted text-xs">New Locations</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{weekly?.newEvents ?? 0}</p>
            <p className="text-pack-text-muted text-xs">New Events</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Recent Activity</SectionTitle>
        {interactions.length === 0 ? (
          <p className="text-pack-text-muted text-sm">No activity yet</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {interactions.map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/person/${i.personId}`)}
                className="hover:bg-pack-card-hover block w-full rounded-lg p-2 text-left"
              >
                <span className="text-sm font-medium">{i.personName}</span>
                <p className="text-pack-text-muted truncate text-xs">{i.notes || i.location}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Upcoming Follow-Ups</SectionTitle>
        {followUps.length === 0 ? (
          <p className="text-pack-text-muted text-sm">None scheduled</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/person/${f.personId}`)}
                className="hover:bg-pack-card-hover flex w-full justify-between rounded-lg p-2 text-left"
              >
                <span className="text-sm font-medium">{f.personName}</span>
                <span className="text-pack-accent text-xs">{formatDate(f.nextFollowUp)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Favorites</SectionTitle>
        <div className="space-y-1">
          {favorites.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/person/${p.id}`)}
              className="hover:bg-pack-card-hover block w-full rounded-lg p-2 text-left text-sm font-medium"
            >
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col items-center justify-center lg:col-span-2">
        <Button size="lg" onClick={() => navigate('/add')} className="w-full max-w-xs">
          <Plus className="h-5 w-5" /> Quick Add Person
        </Button>
        <p className="text-pack-text-muted mt-2 text-sm">Save someone in under 10 seconds</p>
      </Card>
    </div>
  )
}

export function DashboardPage() {
  const { workspace, setWorkspace } = useWorkspace()
  const isDesktop = useIsDesktop()

  return (
    <div className="min-h-dvh">
      <Header title="Dashboard" />

      <div className="space-y-6 px-4 py-4">
        <WorkspaceToggle value={workspace} onChange={setWorkspace} />

        {isDesktop && <DesktopWeeklyWidgets />}

        {workspace === 'work' ? <WorkDashboard /> : <PersonalDashboard />}
      </div>
    </div>
  )
}
