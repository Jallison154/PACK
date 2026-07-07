import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

interface QuickAddHeroProps {
  compact?: boolean
}

export function QuickAddHero({ compact }: QuickAddHeroProps) {
  const navigate = useNavigate()

  if (compact) {
    return (
      <Button className="pack-glow w-full" size="lg" onClick={() => navigate('/add')}>
        <Plus className="h-5 w-5" />
        Quick Add Person
      </Button>
    )
  }

  return (
    <div className="border-pack-accent/25 bg-pack-accent-muted/40 rounded-xl border p-5 text-center">
      <p className="text-pack-text mb-1 text-lg font-semibold">Meet someone new?</p>
      <p className="text-pack-text-secondary mb-4 text-sm">
        Capture a person in under 10 seconds
      </p>
      <Button className="pack-glow mx-auto w-full max-w-sm" size="lg" onClick={() => navigate('/add')}>
        <Plus className="h-5 w-5" />
        Quick Add Person
      </Button>
    </div>
  )
}
