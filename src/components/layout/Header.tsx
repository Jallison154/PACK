import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  showBack?: boolean
  right?: ReactNode
}

export function Header({ title, showBack, right }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="bg-pack-surface/80 border-pack-border sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-lg safe-top">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="text-pack-text-secondary hover:text-pack-text -ml-1 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
