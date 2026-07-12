import { useState, type ReactNode, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { PackLogo } from '../brand/PackLogo'

export function PasscodeGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('pack_unlocked') === 'true' || !localStorage.getItem('pack_passcode'),
  )
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const stored = localStorage.getItem('pack_passcode')
    if (code === stored) {
      sessionStorage.setItem('pack_unlocked', 'true')
      setUnlocked(true)
    } else {
      setError(true)
      setCode('')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm text-center"
      >
        <PackLogo size="md" className="mx-auto mb-5" />
        <p className="text-pack-text-secondary text-sm">Enter your passcode</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''))
            setError(false)
          }}
          className={`bg-pack-card border-pack-border mt-6 w-full rounded-2xl border px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none ${
            error ? 'border-pack-danger' : 'focus:border-pack-accent'
          }`}
          autoFocus
        />
        {error && <p className="text-pack-danger mt-2 text-sm">Incorrect passcode</p>}
        <Button type="submit" className="mt-6 w-full" disabled={code.length < 4}>
          Unlock
        </Button>
      </motion.form>
    </div>
  )
}
