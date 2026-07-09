import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import {
  PlaceForm,
  emptyPlaceForm,
  placeFormToInput,
} from '../components/places/PlaceForm'
import { createPlace } from '../db/repositories/places'

export function AddPlacePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyPlaceForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const place = await createPlace(placeFormToInput(form))
      navigate(`/places/${place.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-h-dvh">
      <Header title="Add Place" showBack />
      <div className="page-px mx-auto max-w-lg space-y-5 pt-6 pb-32">
        <p className="text-pack-text-secondary text-sm leading-relaxed">
          Search for a business or address, use your current location, or enter a place manually.
        </p>
        <PlaceForm form={form} onChange={setForm} />
      </div>
      <div className="pack-nav fixed right-0 bottom-0 left-0 z-20 flex gap-3 p-4 safe-bottom">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => void handleSave()} loading={saving} disabled={!form.name.trim()}>
          Save Place
        </Button>
      </div>
    </motion.div>
  )
}
