import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { PlaceField } from '../places/PlaceField'
import {
  searchPeople,
  createPerson,
  getAllCompanies,
} from '../../db/repositories/people'
import { getAllPlaceNames } from '../../db/repositories/places'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { todayISO } from '../../utils/format'
import { getRecognizedLabels, parseMemoryNotes } from '../../utils/parseMemoryNotes'
import { findPossibleDuplicates } from '../../db/repositories/duplicates'
import { encounterLocationToPersonFields } from '../../utils/encounterLocation'
import type { EncounterLocation, PersonWithTags } from '../../types'

interface QuickCaptureProps {
  onCreated?: () => void
  onOpenPerson?: (personId: string) => void
  size?: 'hero' | 'default'
  placeholder?: string
}

export function QuickCapture({
  onCreated,
  onOpenPerson,
  size = 'default',
  placeholder = 'Who comes to mind?',
}: QuickCaptureProps) {
  const [open, setOpen] = useState(false)
  const isHero = size === 'hero'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          isHero
            ? 'pack-elevated flex w-full items-center gap-3 rounded-[1.75rem] px-5 py-5 text-left'
            : 'pack-elevated flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left'
        }
      >
        <Search
          className={`text-pack-accent shrink-0 ${isHero ? 'h-5 w-5' : 'h-4 w-4'}`}
        />
        <span
          className={`text-pack-text-muted truncate ${isHero ? 'text-lg' : 'text-base'}`}
        >
          {placeholder}
        </span>
      </button>

      <QuickCaptureSheet
        open={open}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
        onOpenPerson={onOpenPerson}
      />
    </>
  )
}

interface QuickCaptureSheetProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
  onOpenPerson?: (personId: string) => void
  initialName?: string
}

export function QuickCaptureSheet({
  open,
  onClose,
  onCreated,
  onOpenPerson,
  initialName = '',
}: QuickCaptureSheetProps) {
  const navigate = useNavigate()
  const { lastUsedWorkspace, setLastUsedWorkspace } = useWorkspace()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)
  const [memory, setMemory] = useState('')
  const [matches, setMatches] = useState<PersonWithTags[]>([])
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [places, setPlaces] = useState<string[]>([])
  const [encounterLocation, setEncounterLocation] = useState<EncounterLocation | null>(null)

  const debouncedName = useDebouncedValue(name, 180)
  const trimmedName = name.trim()

  const openPerson = (personId: string) => {
    onClose()
    if (onOpenPerson) onOpenPerson(personId)
    else navigate(`/person/${personId}`)
  }

  const parsedMemory = useMemo(
    () => parseMemoryNotes(memory, companies, places),
    [memory, companies, places],
  )
  const recognized = useMemo(() => getRecognizedLabels(parsedMemory), [parsedMemory])

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setMemory('')
    setMatches([])
    setEncounterLocation(null)
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    Promise.all([getAllCompanies(), getAllPlaceNames()]).then(([c, p]) => {
      setCompanies(c)
      setPlaces(p)
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const run = async () => {
      const q = debouncedName.trim()
      if (!q) {
        setMatches([])
        return
      }
      const people = await searchPeople(q)
      if (!cancelled) setMatches(people.slice(0, 6))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [debouncedName, open])

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

  const addToPack = async () => {
    if (!trimmedName) return
    setSaving(true)
    try {
      const locationFields = encounterLocationToPersonFields(encounterLocation)
      const whereMetLabel =
        encounterLocation?.kind === 'exact'
          ? encounterLocation.placeName
          : encounterLocation?.kind === 'approximate'
            ? undefined
            : parsedMemory.whereMet

      const duplicates = await findPossibleDuplicates({
        name: trimmedName,
        phone: parsedMemory.phone,
        email: parsedMemory.email,
        company: parsedMemory.company,
        whereMet:
          whereMetLabel ||
          (encounterLocation?.kind === 'approximate' ? 'current location' : undefined),
        notes: memory,
      })
      const strong = duplicates.find((d) => d.strength === 'strong')
      if (strong) {
        const viewExisting = window.confirm(
          `${strong.person.name} may already be in your Pack. View their profile instead of creating a duplicate?`,
        )
        if (viewExisting) {
          openPerson(strong.person.id)
          return
        }
      }

      const person = await createPerson({
        name: trimmedName,
        workspace: lastUsedWorkspace,
        phone: parsedMemory.phone,
        email: parsedMemory.email,
        company: lastUsedWorkspace === 'work' ? parsedMemory.company : undefined,
        whereMet: whereMetLabel,
        notes: [parsedMemory.notes, parsedMemory.url].filter(Boolean).join('\n'),
        dateMet: parsedMemory.dateMet ?? todayISO(),
        ...locationFields,
      })
      setLastUsedWorkspace(lastUsedWorkspace)
      onCreated?.()
      openPerson(person.id)
    } finally {
      setSaving(false)
    }
  }

  const showMatches = trimmedName.length > 0 && matches.length > 0
  const canAdd = trimmedName.length > 0

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="quick-capture-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="auth-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key="quick-capture-sheet"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="auth-modal-sheet pack-elevated flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Quick Capture"
          >
            <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />

            <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3">
              <div>
                <h2 className="text-pack-text text-lg font-semibold tracking-tight">
                  Quick Capture
                </h2>
                <p className="text-pack-text-muted mt-0.5 text-sm">
                  Search your Pack or add someone new.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-pack-text-muted hover:text-pack-text flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              <div className="relative">
                <Search className="text-pack-accent absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Their name"
                  className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-3.5 pr-10 pl-11 text-base"
                  autoComplete="name"
                />
                {name && (
                  <button
                    type="button"
                    onClick={() => setName('')}
                    className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-3 -translate-y-1/2 p-1"
                    aria-label="Clear name"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showMatches && (
                <div className="border-pack-border overflow-hidden rounded-2xl border">
                  {matches.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => openPerson(person.id)}
                      className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left transition-colors last:border-b-0"
                    >
                      <Avatar name={person.name} color={person.profileColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-pack-text truncate font-medium">{person.name}</p>
                        {(person.company || person.whereMet || person.event) && (
                          <p className="text-pack-text-muted truncate text-sm">
                            {person.company || person.whereMet || person.event}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate('/pack', { state: { q: trimmedName } })
                    }}
                    className="text-pack-text-muted hover:text-pack-text-secondary w-full px-3 py-2.5 text-center text-sm transition-colors"
                  >
                    Search My Pack for "{trimmedName}"
                  </button>
                </div>
              )}

              <div>
                <textarea
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  placeholder="What do you remember about them?"
                  rows={3}
                  className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full resize-none px-4 py-3.5 text-base leading-relaxed"
                />
                {recognized.length > 0 && (
                  <p className="text-pack-text-muted/70 mt-2 px-1 text-xs">
                    {recognized.join(' · ')}
                  </p>
                )}
              </div>

              <PlaceField
                label="Where did you meet?"
                value={encounterLocation}
                onChange={setEncounterLocation}
                autoCaptureGps
              />

              {canAdd && (
                <Button
                  className="w-full rounded-2xl"
                  size="lg"
                  onClick={() => void addToPack()}
                  loading={saving}
                >
                  <UserPlus className="h-5 w-5" />
                  Add to Pack
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
