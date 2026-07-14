import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PersonDetailContent } from './PersonDetailContent'

interface PersonDetailSheetProps {
  personId: string | null
  open: boolean
  onClose: () => void
  onChanged?: () => void
  onDeleted?: () => void
}

export function PersonDetailSheet({
  personId,
  open,
  onClose,
  onChanged,
  onDeleted,
}: PersonDetailSheetProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && personId && (
        <motion.div
          key="person-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="auth-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key="person-detail-sheet"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="auth-modal-sheet pack-elevated flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{
              maxHeight: 'min(92dvh, 720px)',
            }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pack member details"
          >
            <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" aria-hidden />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-6 [-webkit-overflow-scrolling:touch]">
              <PersonDetailContent
                personId={personId}
                showClose
                onClose={onClose}
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
