import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export function FAB() {
  const navigate = useNavigate()

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => navigate('/add')}
      className="bg-pack-accent text-black pack-glow fixed right-4 bottom-[4.75rem] z-40 flex h-12 w-12 items-center justify-center rounded-full lg:hidden"
      aria-label="Add person"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </motion.button>
  )
}
