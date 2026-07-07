import { motion } from 'framer-motion'
import { formatMatchSubtitle } from '../../db/repositories/duplicates'
import type { DuplicateMatch } from '../../db/repositories/duplicates'
import { Button } from '../ui/Button'

interface DuplicateWarningModalProps {
  match: DuplicateMatch
  onAddInteraction: () => void
  onCreateAnyway: () => void
  onCancel: () => void
  loading?: boolean
}

export function DuplicateWarningModal({
  match,
  onAddInteraction,
  onCreateAnyway,
  onCancel,
  loading,
}: DuplicateWarningModalProps) {
  const subtitle = formatMatchSubtitle(match.person)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-pack-surface border-pack-border max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border p-6"
      >
        <h3 className="text-lg font-bold">This person may already be in your Pack</h3>
        <p className="text-pack-text-secondary mt-2 text-sm">
          We found someone who looks similar. Add an interaction instead of creating a duplicate?
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
          <Button className="w-full" onClick={onAddInteraction} disabled={loading}>
            Add Interaction to Existing Person
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={onCreateAnyway}
            loading={loading}
          >
            Create New Person Anyway
          </Button>
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
