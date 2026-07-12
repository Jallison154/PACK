import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../context/AuthContext'

type AuthView = 'login' | 'signup' | 'forgot'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialView?: AuthView
  onSuccess?: () => void
}

export function AuthModal({ open, onClose, initialView = 'login', onSuccess }: AuthModalProps) {
  const { signIn, signUp, resetPassword, cloudAvailable } = useAuth()
  const [view, setView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const resetForm = () => {
    setError(null)
    setMessage(null)
  }

  const handleLogin = async () => {
    setLoading(true)
    resetForm()
    const result = await signIn(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSuccess?.()
    onClose()
  }

  const handleSignUp = async () => {
    setLoading(true)
    resetForm()
    const result = await signUp(email, password, displayName)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Check your email to confirm your account, then sign in.')
    setView('login')
  }

  const handleForgot = async () => {
    setLoading(true)
    resetForm()
    const result = await resetPassword(email)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Password reset link sent. Check your email.')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="pack-elevated w-full max-w-md rounded-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-pack-text text-xl font-bold">
                {view === 'login' && 'Sign in to Pack'}
                {view === 'signup' && 'Create your Pack account'}
                {view === 'forgot' && 'Reset password'}
              </h2>
              <p className="text-pack-text-muted mt-1 text-sm">
                Sync your Pack across devices. Your data stays private to you.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-pack-text-muted hover:text-pack-text flex h-9 w-9 items-center justify-center rounded-lg"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!cloudAvailable && (
            <p className="text-pack-warning mb-4 text-sm">
              Cloud sync is not configured on this server. Contact your administrator.
            </p>
          )}

          {view === 'signup' && (
            <div className="mb-3">
              <Input
                label="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {view !== 'forgot' && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
              />
            )}
          </div>

          {error && <p className="text-pack-danger mt-3 text-sm">{error}</p>}
          {message && <p className="text-pack-text-secondary mt-3 text-sm">{message}</p>}

          <div className="mt-5 space-y-3">
            {view === 'login' && (
              <Button className="w-full" onClick={handleLogin} loading={loading} disabled={!cloudAvailable}>
                Sign in
              </Button>
            )}
            {view === 'signup' && (
              <Button className="w-full" onClick={handleSignUp} loading={loading} disabled={!cloudAvailable}>
                Create account
              </Button>
            )}
            {view === 'forgot' && (
              <Button className="w-full" onClick={handleForgot} loading={loading} disabled={!cloudAvailable}>
                Send reset link
              </Button>
            )}
          </div>

          <div className="text-pack-text-muted mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {view === 'login' && (
              <>
                <button type="button" className="hover:text-pack-text" onClick={() => { setView('signup'); resetForm() }}>
                  Create account
                </button>
                <button type="button" className="hover:text-pack-text" onClick={() => { setView('forgot'); resetForm() }}>
                  Forgot password?
                </button>
              </>
            )}
            {view !== 'login' && (
              <button type="button" className="hover:text-pack-text" onClick={() => { setView('login'); resetForm() }}>
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
