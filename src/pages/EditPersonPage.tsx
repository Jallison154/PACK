import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Input, Textarea, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { TagChip } from '../components/ui/TagChip'
import { WorkspaceToggle } from '../components/ui/WorkspaceToggle'
import { getPersonById, updatePerson } from '../db/repositories/people'
import { getHouseholdNames, createHousehold } from '../db/repositories/households'
import { getRelationshipTypes } from '../types'
import type { Workspace } from '../types'

export function EditPersonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [households, setHouseholds] = useState<{ id: string; name: string }[]>([])
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [workspace, setWorkspace] = useState<Workspace>('work')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    whereMet: '',
    event: '',
    city: '',
    state: '',
    dateMet: '',
    notes: '',
    relationshipType: '',
    householdId: '',
    homeAddress: '',
    workLocation: '',
    lastSeenAt: '',
    lastSeenDate: '',
    lastInteractionNotes: '',
  })

  useEffect(() => {
    getHouseholdNames().then(setHouseholds)
    if (!id) return
    getPersonById(id).then((person) => {
      if (!person) return
      setWorkspace(person.workspace)
      setForm({
        name: person.name,
        phone: person.phone ?? '',
        email: person.email ?? '',
        company: person.company ?? '',
        jobTitle: person.jobTitle ?? '',
        whereMet: person.whereMet ?? '',
        event: person.event ?? '',
        city: person.city ?? '',
        state: person.state ?? '',
        dateMet: person.dateMet ?? '',
        notes: person.notes ?? '',
        relationshipType: person.relationshipType ?? '',
        householdId: person.householdId ?? '',
        homeAddress: person.homeAddress ?? '',
        workLocation: person.workLocation ?? '',
        lastSeenAt: person.lastSeenAt ?? '',
        lastSeenDate: person.lastSeenDate ?? '',
        lastInteractionNotes: person.lastInteractionNotes ?? '',
      })
      setTags(person.tags)
    })
  }, [id])

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
      setTagInput('')
    }
  }

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) return
    const hh = await createHousehold({ name: newHouseholdName.trim() })
    setHouseholds((prev) => [...prev, { id: hh.id, name: hh.name }])
    update('householdId', hh.id)
    setNewHouseholdName('')
  }

  const handleSave = async () => {
    if (!id || !form.name.trim()) return
    setSaving(true)
    try {
      await updatePerson(id, {
        name: form.name.trim(),
        workspace,
        phone: form.phone || undefined,
        email: form.email || undefined,
        company: form.company || undefined,
        jobTitle: form.jobTitle || undefined,
        whereMet: form.whereMet || undefined,
        event: form.event || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        dateMet: form.dateMet || undefined,
        notes: form.notes || undefined,
        relationshipType: (form.relationshipType || undefined) as never,
        householdId: form.householdId || undefined,
        homeAddress: form.homeAddress || undefined,
        workLocation: form.workLocation || undefined,
        lastSeenAt: form.lastSeenAt || undefined,
        lastSeenDate: form.lastSeenDate || undefined,
        lastInteractionNotes: form.lastInteractionNotes || undefined,
        tags,
      })
      navigate(`/person/${id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const relTypes = getRelationshipTypes(workspace)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-dvh">
      <Header title="Edit Person" showBack />

      <div className="space-y-4 px-4 py-4 pb-32">
        <div>
          <label className="text-pack-text-secondary mb-2 block text-sm font-medium">Workspace</label>
          <WorkspaceToggle value={workspace} onChange={setWorkspace} size="sm" />
        </div>

        <Input label="Name *" value={form.name} onChange={(e) => update('name', e.target.value)} />

        <Select
          label="Relationship Type"
          value={form.relationshipType}
          onChange={(e) => update('relationshipType', e.target.value)}
          options={relTypes}
        />

        {workspace === 'work' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Company" value={form.company} onChange={(e) => update('company', e.target.value)} />
              <Input label="Job Title" value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} />
            </div>
          </>
        )}

        {workspace === 'personal' && (
          <div>
            <Select
              label="Household"
              value={form.householdId}
              onChange={(e) => update('householdId', e.target.value)}
              options={households.map((h) => ({ value: h.id, label: h.name }))}
            />
            <div className="mt-2 flex gap-2">
              <input
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                placeholder="New household name..."
                className="bg-pack-card border-pack-border text-pack-text flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
              />
              <Button variant="secondary" size="sm" onClick={handleCreateHousehold}>Add</Button>
            </div>
          </div>
        )}

        <Input label="Where Met" value={form.whereMet} onChange={(e) => update('whereMet', e.target.value)} />
        <p className="text-pack-text-muted -mt-2 text-xs">Where you first met — not the same as Last Seen At</p>
        <Input label="Event" value={form.event} onChange={(e) => update('event', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} />
          <Input label="State" value={form.state} onChange={(e) => update('state', e.target.value)} />
        </div>
        <Input label="Date Met" type="date" value={form.dateMet} onChange={(e) => update('dateMet', e.target.value)} />

        <Input label="Home Address" value={form.homeAddress} onChange={(e) => update('homeAddress', e.target.value)} placeholder="Where they live" />
        <Input label="Work Location" value={form.workLocation} onChange={(e) => update('workLocation', e.target.value)} placeholder="Office, shop, etc." />

        <div className="border-pack-border border-t pt-4">
          <p className="text-pack-text-secondary mb-3 text-sm font-medium">Last Seen (auto-updated from interactions)</p>
          <div className="space-y-3">
            <Input label="Last Seen At" value={form.lastSeenAt} onChange={(e) => update('lastSeenAt', e.target.value)} />
            <Input label="Last Seen Date" type="date" value={form.lastSeenDate} onChange={(e) => update('lastSeenDate', e.target.value)} />
            <Textarea label="Last Interaction Notes" value={form.lastInteractionNotes} onChange={(e) => update('lastInteractionNotes', e.target.value)} rows={2} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>

        <div>
          <label className="text-pack-text-secondary mb-1.5 block text-sm font-medium">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="bg-pack-card border-pack-border text-pack-text flex-1 rounded-xl border px-4 py-3 text-base outline-none"
            />
            <Button variant="secondary" size="sm" onClick={addTag}>Add</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))} />
            ))}
          </div>
        </div>

        <Textarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      </div>

      <div className="bg-pack-surface/90 border-pack-border fixed right-0 bottom-0 left-0 z-20 flex gap-3 border-t p-4 backdrop-blur-lg safe-bottom">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
        <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>Save</Button>
      </div>
    </motion.div>
  )
}
