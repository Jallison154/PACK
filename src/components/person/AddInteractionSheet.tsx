import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, X } from 'lucide-react'
import { Input, Textarea, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { PlacePicker } from '../places/PlacePicker'
import { createInteraction } from '../../db/repositories/interactions'
import { todayISO } from '../../utils/format'
import { INTERACTION_TYPES, type InteractionType } from '../../types'

export interface AddInteractionSheetProps {
  personId: string
  personName: string
  open: boolean
  onClose: () => void
  onSaved: (personId: string) => void
  initialNotes?: string
  initialPlaceName?: string
  initialEvent?: string
}

export function AddInteractionSheet({
  personId,
  personName,
  open,
  onClose,
  onSaved,
  initialNotes = '',
  initialPlaceName = '',
  initialEvent = '',
}: AddInteractionSheetProps) {
  const [saving, setSaving] = useState(false)
  const [showPlacePicker, setShowPlacePicker] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [form, setForm] = useState({
    date: todayISO(),
    placeId: null as string | null,
    placeName: initialPlaceName,
    notes: initialNotes,
    event: initialEvent,
    interactionType: '' as InteractionType | '',
    nextFollowUp: '',
  })

  if (!open) return null

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((t) => [...t, trimmed])
      setTagInput('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await createInteraction({
        personId,
        date: form.date,
        placeId: form.placeId ?? undefined,
        location: form.placeId ? undefined : form.placeName || undefined,
        notes: form.notes || undefined,
        event: form.event || undefined,
        interactionType: form.interactionType || undefined,
        nextFollowUp: form.nextFollowUp || undefined,
        tags: tags.length ? tags : undefined,
      })
      onSaved(personId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-pack-surface max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Add to Trail</h3>
              <p className="text-pack-text-secondary text-sm">{personName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-pack-text-secondary hover:text-pack-text rounded-lg p-1"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />

            <div>
              <label className="text-pack-text-secondary mb-1.5 block text-sm font-medium">
                Place / Last Seen At
              </label>
              <button
                type="button"
                onClick={() => setShowPlacePicker(true)}
                className="bg-pack-card border-pack-border hover:border-pack-accent flex w-full items-center gap-2 rounded-xl border px-4 py-3.5 text-left text-base"
              >
                <MapPin className="text-pack-accent h-5 w-5 shrink-0" />
                <span className={form.placeName ? 'text-pack-text' : 'text-pack-text-muted'}>
                  {form.placeName || 'Select or add a place...'}
                </span>
              </button>
            </div>

            <Input
              label="Event"
              value={form.event}
              onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
              placeholder="Conference, party, meeting..."
            />

            <Select
              label="Interaction Type"
              value={form.interactionType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  interactionType: e.target.value as InteractionType,
                }))
              }
              options={INTERACTION_TYPES}
            />

            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What happened?"
              rows={3}
            />

            <div>
              <label className="text-pack-text-secondary mb-1.5 block text-sm font-medium">
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add a tag..."
                  className="bg-pack-card border-pack-border text-pack-text placeholder:text-pack-text-muted focus:border-pack-accent flex-1 rounded-xl border px-4 py-3 text-base outline-none"
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-pack-accent/15 text-pack-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                        className="hover:text-pack-text"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Reconnect Soon"
              type="date"
              value={form.nextFollowUp}
              onChange={(e) => setForm((f) => ({ ...f, nextFollowUp: e.target.value }))}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              Save to Trail
            </Button>
          </div>
        </motion.div>
      </div>

      {showPlacePicker && (
        <PlacePicker
          value={form.placeId}
          onChange={(placeId, placeName) => {
            setForm((f) => ({ ...f, placeId, placeName }))
          }}
          onClose={() => setShowPlacePicker(false)}
        />
      )}
    </>
  )
}
