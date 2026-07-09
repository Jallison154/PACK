import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import {
  PlaceForm,
  placeFormFromInput,
  placeFormToInput,
} from '../components/places/PlaceForm'
import { getPlaceById, updatePlace } from '../db/repositories/places'

export function EditPlacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState(placeFormFromInput({ name: '' }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getPlaceById(id).then((place) => {
      if (place) setForm(placeFormFromInput(place))
      setLoading(false)
    })
  }, [id])

  const handleSave = async () => {
    if (!id || !form.name.trim()) return
    setSaving(true)
    try {
      await updatePlace(id, placeFormToInput(form))
      navigate(`/places/${id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh">
        <Header title="Edit Place" showBack />
        <div className="page-px pt-6"><div className="bg-pack-card h-48 animate-pulse rounded-2xl" /></div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-dvh">
      <Header title="Edit Place" showBack />
      <div className="page-px mx-auto max-w-lg space-y-5 pt-6 pb-32">
        <PlaceForm form={form} onChange={setForm} />
      </div>
      <div className="pack-nav fixed right-0 bottom-0 left-0 z-20 flex gap-3 p-4 safe-bottom">
        <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => void handleSave()} loading={saving} disabled={!form.name.trim()}>
          Save Changes
        </Button>
      </div>
    </motion.div>
  )
}
