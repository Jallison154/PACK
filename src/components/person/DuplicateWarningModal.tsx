import { motion } from 'framer-motion'
import { formatMatchSubtitle } from '../../db/repositories/duplicates'
import type { DuplicateMatch } from '../../db/repositories/duplicates'
import { Button } from '../ui/Button'

interface DuplicateWarningModalProps {
  match: DuplicateMatch
  onOpenExisting: () => void
  onMerge: () => void
  onCreateAnyway?: () => void
  onAddInteraction?: () => void
  onCancel: () => void
  loading?: boolean
  mode?: 'create' | 'edit'
}

export function DuplicateWarningModal({
  match,
  onOpenExisting,
  onMerge,
  onCreateAnyway,
  onAddInteraction,
  onCancel,
  loading,
  mode = 'create',
}: DuplicateWarningModalProps) {
  const subtitle = formatMatchSubtitle(match.person)

  return (
    <div className="auth-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-pack-surface border-pack-border max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border p-6"
      >
        <h3 className="text-lg font-bold">This person may already be in your Pack</h3>
        <p className="text-pack-text-secondary mt-2 text-sm">
          {mode === 'edit'
            ? 'Your changes look similar to another Pack Member. Open them, merge information, or continue editing anyway.'
            : 'We found someone who looks similar. Open the existing profile, merge your information, or create a new entry.'}
        </p>

        <div className="bg-pack-card border-pack-border mt-4 rounded-xl border p-4">
          <p className="text-pack-text-muted mb-1 text-xs font-medium uppercase tracking-wide">
            Possible Match
          </p>
          <p className="text-pack-text font-semibold">{match.person.name}</p>
          {match.person.company && (
            <p className="text-pack-text-secondary text-sm">{match.person.company}</p>
          )}
          {subtitle && (
            <p className="text-pack-text-secondary mt-1 text-sm">{subtitle}</p>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onOpenExisting} disabled={loading}>
            Open Existing
          </Button>
          <Button variant="secondary" className="w-full" onClick={onMerge} loading={loading}>
            Merge Information
          </Button>
          {onAddInteraction && (
            <Button variant="secondary" className="w-full" onClick={onAddInteraction} disabled={loading}>
              Add to Existing Pack Member&apos;s Trail
            </Button>
          )}
          {onCreateAnyway && (
            <Button variant="ghost" className="w-full" onClick={onCreateAnyway} loading={loading}>
              {mode === 'edit' ? 'Save Anyway' : 'Create Anyway'}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
