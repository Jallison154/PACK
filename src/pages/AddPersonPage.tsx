import { useState, useEffect, useMemo, useLayoutEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Input, Textarea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { PossibleMatchesList } from '../components/person/PossibleMatchesList'
import { AddInteractionSheet } from '../components/person/AddInteractionSheet'
import { DuplicateWarningModal } from '../components/person/DuplicateWarningModal'
import { PlaceField } from '../components/places/PlaceField'
import { createPerson, mergeDraftIntoPerson } from '../db/repositories/people'
import {
  findPossibleDuplicates,
  type DuplicateMatch,
} from '../db/repositories/duplicates'
import { useWorkspace } from '../context/WorkspaceContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { todayISO } from '../utils/format'
import { randomProfileColor } from '../utils/colors'
import { encounterLocationToPersonFields } from '../utils/encounterLocation'
import type { EncounterLocation, Workspace } from '../types'

export function AddPersonPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lastUsedWorkspace, setLastUsedWorkspace } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace>(lastUsedWorkspace)
  const [name, setName] = useState(() => {
    const initial = (location.state as { name?: string } | null)?.name?.trim()
    return initial ?? ''
  })
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [encounterLocation, setEncounterLocation] = useState<EncounterLocation | null>(null)
  const [notes, setNotes] = useState('')
  const [matches, setMatches] = useState<DuplicateMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [interactionTarget, setInteractionTarget] = useState<DuplicateMatch | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateMatch | null>(null)

  const searchInput = useMemo(() => {
    const whereMet =
      encounterLocation?.kind === 'exact'
        ? encounterLocation.placeName
        : encounterLocation?.kind === 'approximate'
          ? 'current location'
          : ''
    return { name, phone, email, company, whereMet, notes }
  }, [name, phone, email, company, encounterLocation, notes])

  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useLayoutEffect(() => {
    const input = document.getElementById('add-person-name') as HTMLInputElement | null
    input?.focus()
  }, [])

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

  const buildCreateInput = () => {
    const locationFields = encounterLocationToPersonFields(encounterLocation)
    const whereMet =
      encounterLocation?.kind === 'exact' ? encounterLocation.placeName : undefined

    return {
      name: name.trim(),
      workspace,
      phone: phone || undefined,
      email: email || undefined,
      company: workspace === 'work' ? company || undefined : undefined,
      whereMet,
      notes: notes || undefined,
      dateMet: todayISO(),
      profileColor: randomProfileColor(),
      ...locationFields,
    }
  }

  const createNewPerson = async () => {
    setSaving(true)
    try {
      setLastUsedWorkspace(workspace)
      const person = await createPerson(buildCreateInput())
      navigate(`/person/${person.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return

    const duplicates = await findPossibleDuplicates(searchInput)
    if (duplicates.length > 0) {
      setDuplicateWarning(duplicates[0])
      return
    }

    await createNewPerson()
  }

  const handleMergeFromWarning = async () => {
    if (!duplicateWarning) return
    setSaving(true)
    try {
      setLastUsedWorkspace(workspace)
      await mergeDraftIntoPerson(duplicateWarning.person.id, buildCreateInput())
      setDuplicateWarning(null)
      navigate(`/person/${duplicateWarning.person.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenExistingFromWarning = () => {
    if (!duplicateWarning) return
    setDuplicateWarning(null)
    navigate(`/person/${duplicateWarning.person.id}`)
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
    encounterLocation != null ||
    notes.trim().length >= 3

  const initialPlaceName =
    encounterLocation?.kind === 'exact' ? encounterLocation.placeName : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mobile-form-page min-h-dvh"
    >
      <Header title="Add to Pack" showBack inShell={false} />

      <div className="page-px mx-auto max-w-lg space-y-5 pt-6">
        <p className="text-pack-text-secondary text-sm leading-relaxed">
          Capture a new connection in seconds. Search by name, phone, or email to find someone
          already in your Pack, or add someone new.
        </p>

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
              or add someone new
            </span>
            <div className="bg-pack-border h-px flex-1" />
          </div>
        )}

        <div>
          <label className="text-pack-text-secondary mb-2 block text-sm font-medium">
            Workspace
          </label>
          <WorkspaceToggle
            value={workspace}
            onChange={(ws) => {
              setWorkspace(ws)
              setLastUsedWorkspace(ws)
            }}
          />
        </div>

        <Input
          id="add-person-name"
          label="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who did you meet?"
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

        <PlaceField
          label="Where Met"
          description="Where did you meet them? Your current location is used by default until you choose an exact place."
          value={encounterLocation}
          onChange={setEncounterLocation}
          autoCaptureGps
        />

        <Textarea
          label="Quick Note"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="One line to help you remember..."
          rows={2}
        />
      </div>

      <div className="mobile-form-actions pack-nav">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          loading={saving}
          disabled={!name.trim()}
        >
          Save to Pack
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
          initialPlaceName={initialPlaceName}
        />
      )}

      {duplicateWarning && (
        <DuplicateWarningModal
          match={duplicateWarning}
          onOpenExisting={handleOpenExistingFromWarning}
          onMerge={handleMergeFromWarning}
          onAddInteraction={handleAddInteractionFromWarning}
          onCreateAnyway={handleCreateAnyway}
          onCancel={() => setDuplicateWarning(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
