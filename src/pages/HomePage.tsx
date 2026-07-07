import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/ui/SearchBar'
import { FAB } from '../components/ui/FAB'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PackLogo } from '../components/brand/PackLogo'
import { PersonCard } from '../components/person/PersonCard'
import { getRecentPeople } from '../db/repositories/people'
import { useWorkspace } from '../context/WorkspaceContext'
import { WORKSPACES } from '../types'
import type { PersonWithTags } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const { workspace, setWorkspace } = useWorkspace()
  const [search, setSearch] = useState('')
  const [people, setPeople] = useState<PersonWithTags[]>([])
  const [loading, setLoading] = useState(true)

  const loadPeople = useCallback(async () => {
    setLoading(true)
    const data = await getRecentPeople(workspace, 30)
    setPeople(data)
    setLoading(false)
  }, [workspace])

  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  const wsLabel = WORKSPACES.find((w) => w.value === workspace)?.label ?? workspace
  const favorites = people.filter((p) => p.isFavorite)
  const recent = people.filter((p) => !p.isFavorite)

  return (
    <div className="min-h-dvh pb-20">
      <div className="border-pack-border flex items-center justify-between gap-3 border-b px-4 py-2.5 safe-top">
        <PackLogo href="/" size="sm" />
        <div className="shrink-0">
          <WorkspaceToggle value={workspace} onChange={setWorkspace} size="sm" />
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        onFocus={() => navigate('/search', { state: { q: search } })}
        placeholder={`Search ${wsLabel.toLowerCase()} contacts...`}
      />

      <div className="px-4 py-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-pack-text-secondary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Users className="h-4 w-4" />
            Recent — {wsLabel}
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-pack-card h-20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="py-16 text-center">
              <div className="bg-pack-accent-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Users className="text-pack-accent h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">No {wsLabel.toLowerCase()} contacts yet</h3>
              <p className="text-pack-text-secondary mt-1 text-sm">
                Tap + to add someone you just met
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((person, i) => (
                <PersonCard key={person.id} person={person} index={i} />
              ))}
              {recent.map((person, i) => (
                <PersonCard key={person.id} person={person} index={i + favorites.length} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <FAB />
    </div>
  )
}
