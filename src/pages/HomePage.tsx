import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from '../components/ui/WorkspaceToggle'
import { HomeMobile } from '../components/home/HomeMobile'
import { HomeDesktop } from '../components/home/HomeDesktop'
import { type HomeScrollData } from '../components/home/HomeScrollContent'
import {
  getRecentlyAdded,
  getRecentInteractions,
  getUpcomingFollowUps,
  getHomeStats,
} from '../db/repositories/dashboard'
import { getRecentPlaces } from '../db/repositories/places'
import { listPackMembers } from '../db/repositories/people'
import { buildMemoryFeed, filterTodayTrail } from '../utils/memoryFeed'

const emptyScrollData: HomeScrollData = {
  todayTrail: [],
  followUps: [],
  recentPlaces: [],
  corePack: [],
  recentPackMembers: [],
  insights: { people: 0, places: 0, companies: 0, followUps: 0 },
}

export function HomePage() {
  const isMobile = useIsMobile(768)
  const [scrollData, setScrollData] = useState<HomeScrollData>(emptyScrollData)

  const load = useCallback(async () => {
    const [interactions, recent, followUps, places, corePack, recentMembers, stats] =
      await Promise.all([
        getRecentInteractions(undefined, 20),
        getRecentlyAdded(),
        getUpcomingFollowUps(),
        getRecentPlaces(5),
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
      insights: {
        people: stats.people,
        places: stats.places,
        companies: stats.companies,
        followUps: stats.followUps,
      },
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (isMobile) {
    return <HomeMobile data={scrollData} onCreated={load} />
  }

  return <HomeDesktop data={scrollData} onCreated={load} />
}
