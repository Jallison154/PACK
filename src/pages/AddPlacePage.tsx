import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import {
  PlaceForm,
  emptyPlaceForm,
  placeFormToInput,
  type PlaceFormValues,
} from '../components/places/PlaceForm'
import { createPlace, findOrCreatePlaceFromMapbox } from '../db/repositories/places'
import type { MapboxPlaceResult } from '../services/mapbox/types'

function mapboxResultFromForm(form: PlaceFormValues): MapboxPlaceResult {
  return {
    mapboxId: form.mapboxId,
    name: form.name.trim(),
    featureType: form.featureType || 'poi',
    address: form.address.trim() || null,
    fullAddress: [form.address, form.city, form.state, form.postalCode, form.country]
      .filter(Boolean)
      .join(', ') || null,
    city: form.city.trim() || null,
    region: form.state.trim() || null,
    postalCode: form.postalCode.trim() || null,
    country: form.country.trim() || null,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    category: form.category || null,
    poiCategories: form.poiCategories,
    brand: form.brand.trim() || null,
  }
}

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
      const place = form.mapboxId
        ? await findOrCreatePlaceFromMapbox(mapboxResultFromForm(form))
        : await createPlace(placeFormToInput(form))
      navigate(`/places/${place.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mobile-form-page min-h-dvh">
      <Header title="Add Place" showBack />
      <div className="page-px mx-auto max-w-lg space-y-5 pt-6">
        <p className="text-pack-text-secondary text-sm leading-relaxed">
          Search for a business or address, use your current location, or enter a place manually.
        </p>
        <PlaceForm form={form} onChange={setForm} />
      </div>
      <div className="mobile-form-actions pack-nav">
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
