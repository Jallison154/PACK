import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { MemoryPersonCard } from '../components/home/MemoryPersonCard'
import { EmptyState } from '../components/ui/EmptyState'
import { getFavoritePeople } from '../db/repositories/people'

export function FavoritesPage() {
  const [people, setPeople] = useState<Awaited<ReturnType<typeof getFavoritePeople>>>([])

  useEffect(() => {
    getFavoritePeople().then(setPeople)
  }, [])

  return (
    <div className="min-h-dvh">
      <div className="safe-top mx-auto max-w-lg px-5 pt-6 pb-8">
        <header className="mb-8">
          <h1 className="text-pack-text text-2xl font-semibold tracking-tight">Core Pack</h1>
          <p className="text-pack-text-muted mt-2 text-sm leading-relaxed">
            The people who matter most — family, close friends, VIP clients, and pinned
            connections.
          </p>
        </header>

        {people.length === 0 ? (
          <EmptyState
            message="Your Core Pack is empty."
            hint="Star a Pack member from their profile to add them here."
            icon={<Users className="h-7 w-7" />}
          />
        ) : (
          <div className="divide-pack-border/40 divide-y">
            {people.map((person, i) => (
              <MemoryPersonCard key={person.id} person={person} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
