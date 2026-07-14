import { useEffect, useMemo, useState } from 'react'
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
import { applyQuickCaptureNameChange } from '../../utils/quickCaptureName'
import { encounterLocationToPersonFields } from '../../utils/encounterLocation'
import type { EncounterLocation, PersonWithTags } from '../../types'

function dismissMatchesSoon(setFocused: (v: boolean) => void) {
  window.setTimeout(() => setFocused(false), 150)
}

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
  placeholder,
}: QuickCaptureProps) {
  const navigate = useNavigate()
  const { lastUsedWorkspace, setLastUsedWorkspace } = useWorkspace()
  const [name, setName] = useState('')
  const [memory, setMemory] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [focused, setFocused] = useState(false)
  const [matches, setMatches] = useState<PersonWithTags[]>([])
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [places, setPlaces] = useState<string[]>([])
  const [encounterLocation, setEncounterLocation] = useState<EncounterLocation | null>(null)

  const debouncedName = useDebouncedValue(name, 180)
  const trimmedName = name.trim()

  const openPerson = (personId: string) => {
    if (onOpenPerson) onOpenPerson(personId)
    else navigate(`/person/${personId}`)
  }

  const parsedMemory = useMemo(
    () => parseMemoryNotes(memory, companies, places),
    [memory, companies, places],
  )
  const recognized = useMemo(() => getRecognizedLabels(parsedMemory), [parsedMemory])

  useEffect(() => {
    Promise.all([getAllCompanies(), getAllPlaceNames()]).then(([c, p]) => {
      setCompanies(c)
      setPlaces(p)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const q = debouncedName.trim()
      if (!q) {
        setMatches([])
        return
      }
      const people = await searchPeople(q)
      if (!cancelled) setMatches(people.slice(0, 4))
    }
    run()
    return () => {
      cancelled = true
    }
  }, [debouncedName])

  const handleNameChange = (nextValue: string) => {
    const next = applyQuickCaptureNameChange(nextValue, expanded)
    setName(next.name)
    setExpanded(next.expanded)
  }

  const reset = () => {
    setName('')
    setMemory('')
    setExpanded(false)
    setFocused(false)
    setMatches([])
    setEncounterLocation(null)
  }

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
        whereMet: whereMetLabel || (encounterLocation?.kind === 'approximate' ? 'current location' : undefined),
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
      reset()
      onCreated?.()
      openPerson(person.id)
    } finally {
      setSaving(false)
    }
  }

  const showMatches = trimmedName.length > 0 && matches.length > 0
  const canAdd = trimmedName.length > 0
  const isHero = size === 'hero'

  const shellClass = isHero
    ? 'pack-elevated rounded-[1.75rem] p-2.5'
    : 'pack-elevated rounded-2xl p-1.5'
  const inputClass = isHero
    ? 'pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-5 pr-4 pl-12 text-lg'
    : 'pack-inset text-pack-text placeholder:text-pack-text-muted w-full py-3 pr-4 pl-11 text-base'

  return (
    <div className="relative w-full">
      <div className={shellClass}>
        <div className="relative">
          <Search
            className={`text-pack-accent absolute top-1/2 -translate-y-1/2 ${isHero ? 'left-5 h-5 w-5' : 'left-4 h-4 w-4'}`}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => dismissMatchesSoon(setFocused)}
            placeholder={
              expanded ? 'Their name' : (placeholder ?? 'Who comes to mind?')
            }
            className={`${inputClass} ${expanded ? 'pr-12' : ''}`}
            autoComplete="name"
          />
          {expanded && (
            <button
              type="button"
              onClick={reset}
              className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="expanded-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3 overflow-hidden px-1 pt-3 pb-1"
            >
              <div>
                <textarea
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  onFocus={() => setFocused(true)}
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
                  onClick={addToPack}
                  loading={saving}
                >
                  <UserPlus className="h-5 w-5" />
                  Add to Pack
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {focused && showMatches && (
        <div className="pack-elevated absolute right-0 left-0 z-20 mt-2 overflow-hidden rounded-2xl">
          <div className="py-1">
            {matches.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  reset()
                  openPerson(person.id)
                }}
                className="hover:bg-pack-card-hover/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
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
              onClick={() => navigate('/pack', { state: { q: trimmedName } })}
              className="text-pack-text-muted hover:text-pack-text-secondary w-full px-3 py-2.5 text-center text-sm transition-colors"
            >
              Search My Pack for "{trimmedName}"
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
