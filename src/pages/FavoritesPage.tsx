import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PersonCard } from '../components/person/PersonCard'
import { getFavoritePeople } from '../db/repositories/people'
import { useWorkspace } from '../context/WorkspaceContext'
import type { PersonWithTags } from '../types'

export function FavoritesPage() {
  const { workspace, setWorkspace } = useWorkspace()
  const [people, setPeople] = useState<PersonWithTags[]>([])

  useEffect(() => {
    getFavoritePeople(workspace).then(setPeople)
  }, [workspace])

  return (
    <div className="min-h-dvh">
      <Header title="Saved" />
      <div className="border-pack-border border-b px-4 pb-3">
        <WorkspaceToggle value={workspace} onChange={setWorkspace} size="sm" />
      </div>
      <div className="px-4 py-4">
        {people.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="text-pack-text-muted mx-auto h-12 w-12" />
            <p className="text-pack-text-secondary mt-4">No favorites yet</p>
            <p className="text-pack-text-muted mt-1 text-sm">
              Star people from their detail page
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {people.map((person, i) => (
              <PersonCard key={person.id} person={person} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
