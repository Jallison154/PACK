import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { HomeRevealSection } from './HomeRevealSection'
import { HomePersonRow } from './HomePersonRow'
import { HomePackMapCard } from './HomePackMapCard'
import { QuickCapture } from './QuickCapture'
import { PackLogo } from '../brand/PackLogo'
import { Avatar } from '../ui/Avatar'
import { useProfile } from '../../context/ProfileContext'
import { useSync } from '../../context/SyncContext'
import { useAuth } from '../../context/AuthContext'
import { getGreeting } from '../../utils/greeting'
import { formatDate } from '../../utils/format'
import { getRelationshipLabel } from '../../types'
import { getSyncStatusLabel } from '../../services/sync/engine'
import type { HomeScrollData } from './HomeScrollContent'
import type { MemoryItem } from '../../utils/memoryFeed'
import type { PersonWithTags } from '../../types'
import type { ReactNode } from 'react'

interface HomeDesktopProps {
  data: HomeScrollData
  onCreated: () => void
  onOpenPerson: (personId: string) => void
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-pack-text-muted/70 px-2 text-sm leading-relaxed">{children}</p>
}

function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-pack-border rounded-2xl border bg-[#171717] p-4 ${className}`}>
      {children}
    </div>
  )
}

function TrailItem({
  item,
  onOpenPerson,
}: {
  item: MemoryItem
  onOpenPerson: (personId: string) => void
}) {
  const timeLabel = /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    ? formatDate(item.date)
    : (() => {
        try {
          return format(parseISO(item.date), 'h:mm a')
        } catch {
          return formatDate(item.date)
        }
      })()

  return (
    <button
      type="button"
      onClick={() => onOpenPerson(item.personId)}
      className="hover:bg-pack-card-hover/50 grid w-full grid-cols-[64px_1fr] gap-3 rounded-xl px-2 py-2.5 text-left transition-colors"
    >
      <span className="text-pack-text-muted pt-0.5 text-[11px] tabular-nums">{timeLabel}</span>
      <span className="min-w-0">
        <span className="text-pack-text block truncate text-[15px]">
          <span className="text-pack-text-muted">{item.verb}</span>{' '}
          <span className="font-medium">{item.personName}</span>
        </span>
        {(item.place || item.detail) && (
          <span className="text-pack-text-muted mt-0.5 block truncate text-xs">
            {[item.place, item.detail].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
    </button>
  )
}

function InsightStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-pack-text text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-pack-text-muted text-[11px]">{label}</p>
    </div>
  )
}

function coreLabel(person: PersonWithTags): string {
  return person.company || getRelationshipLabel(person.relationshipType) || 'Core'
}

export function HomeDesktop({ data, onCreated, onOpenPerson }: HomeDesktopProps) {
  const navigate = useNavigate()
  const { greetingName } = useProfile()
  const { isAuthenticated } = useAuth()
  const { syncStatus, lastSyncAt, diagnostics } = useSync()
  const {
    todayTrail,
    followUps,
    corePack,
    recentPackMembers,
    mapPlaces,
    insights,
  } = data

  const syncLabel = getSyncStatusLabel(syncStatus, lastSyncAt, isAuthenticated)

  return (
    <div className="page-top page-px mx-auto w-full max-w-[1500px] pb-16">
      <header className="mb-8 grid items-end gap-5 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)_minmax(160px,200px)]">
        <div className="min-w-0">
          <PackLogo href="/" size="sm" align="left" className="mb-3 lg:hidden" />
          <h1 className="text-pack-text text-[1.75rem] leading-tight font-semibold tracking-tight xl:text-[2rem]">
            {getGreeting(greetingName)}
          </h1>
          <p className="text-pack-text-muted mt-1 text-sm">Remember every connection.</p>
        </div>

        <div className="min-w-0">
          <QuickCapture
            onCreated={onCreated}
            onOpenPerson={onOpenPerson}
            size="hero"
            placeholder="Search your Pack or add someone…"
          />
        </div>

        <div className="hidden text-right lg:block">
          <p className="text-pack-text-muted text-[11px] tracking-wide uppercase">Pack Sync</p>
          <p
            className={`truncate text-xs ${
              diagnostics.lastSyncError ? 'text-pack-danger' : 'text-pack-text-secondary'
            }`}
            title={diagnostics.lastSyncError ?? syncLabel}
          >
            {diagnostics.lastSyncError ? 'Sync needs attention' : syncLabel}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
        <div className="space-y-6">
          <SectionCard>
            <HomeRevealSection
              title="Recent Pack Members"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/pack')}
                  className="text-pack-accent shrink-0 text-xs font-medium"
                >
                  View My Pack
                </button>
              }
            >
              {recentPackMembers.length > 0 ? (
                <div className="-mx-1">
                  {recentPackMembers.map((person) => (
                    <HomePersonRow
                      key={person.id}
                      person={person}
                      onOpenPerson={onOpenPerson}
                    />
                  ))}
                </div>
              ) : (
                <EmptyLine>Your Pack is just getting started.</EmptyLine>
              )}
            </HomeRevealSection>
          </SectionCard>

          <SectionCard>
            <HomeRevealSection title="Today’s Trail">
              {todayTrail.length > 0 ? (
                <div className="relative">
                  <div
                    className="bg-pack-border absolute top-2 bottom-2 left-[76px] w-px"
                    aria-hidden
                  />
                  <div className="space-y-0.5">
                    {todayTrail.map((item) => (
                      <TrailItem key={item.id} item={item} onOpenPerson={onOpenPerson} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyLine>No new trails yet.</EmptyLine>
              )}
            </HomeRevealSection>
          </SectionCard>

          <SectionCard>
            <HomeRevealSection title="Reconnect Soon">
              {followUps.length > 0 ? (
                <div className="space-y-1">
                  {followUps.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenPerson(item.personId)}
                      className="hover:bg-pack-card-hover/50 flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-pack-text truncate text-[15px] font-medium">
                          {item.personName}
                        </p>
                        <p className="text-pack-text-muted mt-0.5 truncate text-xs">
                          Follow-up due
                          {item.notes ? ` · ${item.notes}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {item.nextFollowUp && (
                          <p className="text-pack-accent text-xs font-medium">
                            {formatDate(item.nextFollowUp)}
                          </p>
                        )}
                        <p className="text-pack-text-muted mt-1 text-[11px]">Open</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyLine>Your Pack is all caught up.</EmptyLine>
              )}
            </HomeRevealSection>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <HomePackMapCard places={mapPlaces} />

          <SectionCard>
            <HomeRevealSection
              title="Core Pack"
              action={
                corePack.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate('/pack')}
                    className="text-pack-text-muted hover:text-pack-text-secondary text-xs"
                  >
                    See all
                  </button>
                ) : undefined
              }
            >
              {corePack.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {corePack.slice(0, 6).map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => onOpenPerson(person.id)}
                      className="hover:bg-pack-card-hover/50 flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors"
                    >
                      <Avatar name={person.name} color={person.profileColor} size="lg" />
                      <span className="min-w-0">
                        <span className="text-pack-text block truncate text-xs font-medium">
                          {person.name.split(' ')[0]}
                        </span>
                        <span className="text-pack-text-muted block truncate text-[10px]">
                          {coreLabel(person)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyLine>Star people to build your Core Pack.</EmptyLine>
              )}
            </HomeRevealSection>
          </SectionCard>

          <SectionCard>
            <HomeRevealSection title="Pack Insights">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                <InsightStat value={insights.people} label="Members" />
                <InsightStat value={insights.places} label="Places" />
                <InsightStat value={insights.companies} label="Companies" />
                <InsightStat value={insights.addedThisWeek} label="Added this week" />
                <InsightStat value={insights.followUps} label="Reconnect" />
              </div>
            </HomeRevealSection>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
