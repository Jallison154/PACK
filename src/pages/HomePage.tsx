import { useState, useEffect, useCallback } from 'react'
import { usePackDataRefresh } from '../hooks/usePackDataRefresh'
import { useIsMobile, DESKTOP_BREAKPOINT } from '../components/ui/WorkspaceToggle'
import { HomeMobile } from '../components/home/HomeMobile'
import { HomeDesktop } from '../components/home/HomeDesktop'
import { type HomeScrollData } from '../components/home/HomeScrollContent'
import { PersonDetailSheet } from '../components/person/PersonDetailSheet'
import {
  getRecentlyAdded,
  getRecentInteractions,
  getUpcomingFollowUps,
  getHomeStats,
} from '../db/repositories/dashboard'
import { getRecentPlaces, getPlacesWithCoordinates } from '../db/repositories/places'
import { listPackMembers } from '../db/repositories/people'
import { buildMemoryFeed, filterTodayTrail } from '../utils/memoryFeed'

const emptyScrollData: HomeScrollData = {
  todayTrail: [],
  followUps: [],
  recentPlaces: [],
  corePack: [],
  recentPackMembers: [],
  mapPlaces: [],
  insights: { people: 0, places: 0, companies: 0, followUps: 0, addedThisWeek: 0 },
}

export function HomePage() {
  const isMobile = useIsMobile(DESKTOP_BREAKPOINT)
  const [scrollData, setScrollData] = useState<HomeScrollData>(emptyScrollData)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [interactions, recent, followUps, places, mapPlaces, corePack, recentMembers, stats] =
      await Promise.all([
        getRecentInteractions(undefined, 20),
        getRecentlyAdded(),
        getUpcomingFollowUps(),
        getRecentPlaces(5),
        getPlacesWithCoordinates(),
        listPackMembers({ view: 'core', sort: 'name' }),
        listPackMembers({ sort: 'recently_added' }),
        getHomeStats(),
      ])

    const feed = buildMemoryFeed(interactions, recent)

    setScrollData({
      todayTrail: filterTodayTrail(feed),
      followUps: followUps.slice(0, 6),
      recentPlaces: places,
      corePack: corePack.slice(0, 6),
      recentPackMembers: recentMembers.slice(0, 8),
      mapPlaces,
      insights: {
        people: stats.people,
        places: stats.places,
        companies: stats.companies,
        followUps: stats.followUps,
        addedThisWeek: stats.addedThisWeek,
      },
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  usePackDataRefresh(load)

  const openPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId)
  }, [])

  const sheet = (
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
  )

  if (isMobile) {
    return (
      <>
        <HomeMobile data={scrollData} onCreated={load} onOpenPerson={openPerson} />
        {sheet}
      </>
    )
  }

  return (
    <>
      <HomeDesktop data={scrollData} onCreated={load} onOpenPerson={openPerson} />
      {sheet}
    </>
  )
}
