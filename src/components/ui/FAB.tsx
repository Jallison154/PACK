import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export function FAB() {
  const navigate = useNavigate()

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate('/add')}
      className="bg-pack-accent text-black shadow-pack-accent/30 fixed right-5 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8 md:right-8 md:h-16 md:w-16"
      aria-label="Add person"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </motion.button>
  )
}
