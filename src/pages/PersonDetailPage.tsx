import { MobilePageShell } from '../components/layout/MobilePageShell'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PersonDetailContent } from '../components/person/PersonDetailContent'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return (
      <MobilePageShell inShell={false} top={false} padded={false}>
        <div className="page-px pt-10">
          <p className="text-pack-text-secondary text-sm">Pack member not found.</p>
        </div>
      </MobilePageShell>
    )
  }

  return (
    <MobilePageShell inShell={false} top={false} padded={false}>
      <div className="page-nav-top page-px flex items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-pack-text-muted hover:text-pack-text flex h-10 w-10 items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="page-px mx-auto max-w-lg pt-2 pb-10">
        <PersonDetailContent
          personId={id}
          onDeleted={() => navigate('/pack', { replace: true })}
        />
      </div>
    </MobilePageShell>
  )
}
