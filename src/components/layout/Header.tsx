import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  showBack?: boolean
  backTo?: string
  right?: ReactNode
  /** When true (default), omits safe-top — AppLayout / DesktopNav own the notch inset. */
  inShell?: boolean
}

export function Header({ title, showBack, backTo, right, inShell = true }: HeaderProps) {
  const navigate = useNavigate()

  const goBack = () => {
    if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header
      className={`pack-nav page-px sticky top-0 z-20 flex items-center gap-3 ${
        inShell ? 'page-nav-top-shell' : 'page-nav-top'
      }`}
    >
      {showBack && (
        <button
          onClick={goBack}
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
