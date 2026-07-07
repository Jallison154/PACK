import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
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
import type { PersonWithTags } from '../../types'

function dismissMatchesSoon(setFocused: (v: boolean) => void) {
  window.setTimeout(() => setFocused(false), 150)
}

interface QuickCaptureProps {
  onCreated?: () => void
  size?: 'hero' | 'default'
}

export function QuickCapture({ onCreated, size = 'default' }: QuickCaptureProps) {
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

  const debouncedName = useDebouncedValue(name, 180)
  const trimmedName = name.trim()

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

  const openExpanded = (initialName = '') => {
    setExpanded(true)
    if (initialName) setName(initialName)
  }

  const reset = () => {
    setName('')
    setMemory('')
    setExpanded(false)
    setFocused(false)
    setMatches([])
  }

  const addToPack = async () => {
    if (!trimmedName) return
    setSaving(true)
    try {
      const duplicates = await findPossibleDuplicates({
        name: trimmedName,
        phone: parsedMemory.phone,
        email: parsedMemory.email,
        company: parsedMemory.company,
        whereMet: parsedMemory.whereMet,
        notes: memory,
      })
      const strong = duplicates.find((d) => d.strength === 'strong')
      if (strong) {
        const viewExisting = window.confirm(
          `${strong.person.name} may already be in your Pack. View their profile instead of creating a duplicate?`,
        )
        if (viewExisting) {
          navigate(`/person/${strong.person.id}`)
          return
        }
      }

      const person = await createPerson({
        name: trimmedName,
        workspace: lastUsedWorkspace,
        phone: parsedMemory.phone,
        email: parsedMemory.email,
        company: lastUsedWorkspace === 'work' ? parsedMemory.company : undefined,
        whereMet: parsedMemory.whereMet,
        notes: [parsedMemory.notes, parsedMemory.url].filter(Boolean).join('\n'),
        dateMet: parsedMemory.dateMet ?? todayISO(),
      })
      setLastUsedWorkspace(lastUsedWorkspace)
      reset()
      onCreated?.()
      navigate(`/person/${person.id}`)
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
        <AnimatePresence initial={false} mode="wait">
          {!expanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <Search
                  className={`text-pack-accent absolute top-1/2 -translate-y-1/2 ${isHero ? 'left-5 h-5 w-5' : 'left-4 h-4 w-4'}`}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    openExpanded(e.target.value)
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => dismissMatchesSoon(setFocused)}
                  placeholder="Who comes to mind?"
                  className={inputClass}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3 overflow-hidden px-1 py-1"
            >
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => dismissMatchesSoon(setFocused)}
                    autoFocus
                    placeholder="Their name"
                    className="pack-inset text-pack-text placeholder:text-pack-text-muted w-full px-4 py-3.5 text-lg"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    className="text-pack-text-muted hover:text-pack-text absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
                    aria-label="Clear"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

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
                  navigate(`/person/${person.id}`)
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
              onClick={() => navigate('/search', { state: { q: trimmedName } })}
              className="text-pack-text-muted hover:text-pack-text-secondary w-full px-3 py-2.5 text-center text-sm transition-colors"
            >
              Search for "{trimmedName}"
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
