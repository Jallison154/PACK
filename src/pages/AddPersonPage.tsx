import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Input, Textarea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PossibleMatchesList } from '../components/person/PossibleMatchesList'
import { AddInteractionSheet } from '../components/person/AddInteractionSheet'
import { DuplicateWarningModal } from '../components/person/DuplicateWarningModal'
import { createPerson } from '../db/repositories/people'
import {
  findPossibleDuplicates,
  type DuplicateMatch,
} from '../db/repositories/duplicates'
import { useWorkspace } from '../context/WorkspaceContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { todayISO } from '../utils/format'
import { randomProfileColor } from '../utils/colors'
import type { Workspace } from '../types'

export function AddPersonPage() {
  const navigate = useNavigate()
  const { lastUsedWorkspace, setLastUsedWorkspace } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace>(lastUsedWorkspace)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [whereMet, setWhereMet] = useState('')
  const [notes, setNotes] = useState('')
  const [matches, setMatches] = useState<DuplicateMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [interactionTarget, setInteractionTarget] = useState<DuplicateMatch | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateMatch | null>(null)

  const searchInput = useMemo(
    () => ({ name, phone, email, company, whereMet, notes }),
    [name, phone, email, company, whereMet, notes],
  )
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setSearching(true)
      try {
        const results = await findPossibleDuplicates(debouncedSearch)
        if (!cancelled) setMatches(results)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  const createNewPerson = async () => {
    setSaving(true)
    try {
      setLastUsedWorkspace(workspace)
      const person = await createPerson({
        name: name.trim(),
        workspace,
        phone: phone || undefined,
        email: email || undefined,
        company: workspace === 'work' ? company || undefined : undefined,
        whereMet: whereMet || undefined,
        notes: notes || undefined,
        dateMet: todayISO(),
        profileColor: randomProfileColor(),
      })
      navigate(`/person/${person.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return

    const duplicates = await findPossibleDuplicates({ name, phone, email, company, whereMet, notes })
    if (duplicates.length > 0) {
      setDuplicateWarning(duplicates[0])
      return
    }

    await createNewPerson()
  }

  const handleAddInteractionFromWarning = () => {
    if (!duplicateWarning) return
    setInteractionTarget(duplicateWarning)
    setDuplicateWarning(null)
  }

  const handleCreateAnyway = async () => {
    setDuplicateWarning(null)
    await createNewPerson()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const hasSearchQuery =
    name.trim().length >= 2 ||
    phone.trim().length >= 3 ||
    email.includes('@') ||
    company.trim().length >= 2 ||
    whereMet.trim().length >= 2 ||
    notes.trim().length >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh"
    >
      <Header title="Quick Add" showBack />

      <div className="space-y-5 px-4 py-6 pb-32">
        <div className="flex items-start gap-3">
          <Search className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-pack-text-secondary text-sm">
            Search-first capture — type a name, phone, or email to find someone you already know,
            or save a new person.
          </p>
        </div>

        {hasSearchQuery && (
          <div className="min-h-[4rem]">
            {searching && matches.length === 0 ? (
              <p className="text-pack-text-muted text-sm">Searching your Pack...</p>
            ) : (
              <PossibleMatchesList
                matches={matches}
                onOpenProfile={(id) => navigate(`/person/${id}`)}
                onAddInteraction={setInteractionTarget}
              />
            )}
          </div>
        )}

        {hasSearchQuery && matches.length > 0 && (
          <div className="border-pack-border flex items-center gap-3 border-t pt-2">
            <div className="bg-pack-border h-px flex-1" />
            <span className="text-pack-text-muted text-xs font-medium uppercase tracking-wide">
              or create new
            </span>
            <div className="bg-pack-border h-px flex-1" />
          </div>
        )}

        <div>
          <label className="text-pack-text-secondary mb-2 block text-sm font-medium">
            Workspace
          </label>
          <WorkspaceToggle value={workspace} onChange={setWorkspace} />
        </div>

        <Input
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who did you meet?"
          autoFocus
          autoComplete="name"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For duplicate detection"
            autoComplete="tel"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For duplicate detection"
            autoComplete="email"
          />
        </div>

        {workspace === 'work' && (
          <Input
            label="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Where do they work?"
          />
        )}

        <Input
          label="Where Met"
          value={whereMet}
          onChange={(e) => setWhereMet(e.target.value)}
          placeholder="Conference, coffee shop, neighborhood..."
        />

        <Textarea
          label="Quick Note"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="One line to help you remember..."
          rows={2}
        />
      </div>

      <div className="bg-pack-surface/90 border-pack-border fixed right-0 bottom-0 left-0 z-20 flex gap-3 border-t p-4 backdrop-blur-lg safe-bottom">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          loading={saving}
          disabled={!name.trim()}
        >
          Save
        </Button>
      </div>

      {interactionTarget && (
        <AddInteractionSheet
          key={interactionTarget.person.id}
          personId={interactionTarget.person.id}
          personName={interactionTarget.person.name}
          open
          onClose={() => setInteractionTarget(null)}
          onSaved={(id) => navigate(`/person/${id}`, { replace: true })}
          initialNotes={notes}
          initialPlaceName={whereMet}
        />
      )}

      {duplicateWarning && (
        <DuplicateWarningModal
          match={duplicateWarning}
          onAddInteraction={handleAddInteractionFromWarning}
          onCreateAnyway={handleCreateAnyway}
          onCancel={() => setDuplicateWarning(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
