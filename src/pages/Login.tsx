import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from '../lib/security'

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function Login() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') ?? 'cashier'
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lockoutRemaining <= 0) return
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutRemaining])

  const handleSubmit = async () => {
    if (lockoutRemaining > 0) return
    setError('')
    if (pin.length < MIN_PIN_LENGTH) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} digits`)
      return
    }
    setLoading(true)
    const result = await login(pin)
    setLoading(false)

    if (!result.ok) {
      if (result.reason === 'locked') {
        setLockoutRemaining(result.remainingMs ?? 0)
        setError('Too many failed attempts. Please wait before trying again.')
      } else if (result.reason === 'invalid_format') {
        setError('Invalid PIN format.')
      } else {
        setError('Invalid PIN')
      }
      setPin('')
      return
    }

    if (role === 'admin' && result.user.role !== 'admin') {
      setError('Access denied. Admin PIN required.')
      setPin('')
      return
    }

    navigate(role === 'admin' ? '/admin' : '/cashier')
  }

  const handleDigit = (digit: string) => {
    if (pin.length < MAX_PIN_LENGTH) setPin((p) => p + digit)
  }

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1))
  }

  const locked = lockoutRemaining > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <Lock size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {role === 'admin' ? 'Admin' : 'Cashier'} Login
          </h2>
          <p className="mt-1 text-sm text-slate-500">Enter your PIN to continue</p>
        </div>

        <div className="mb-6 flex justify-center gap-3">
          {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full transition ${
                i < pin.length ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-center text-sm text-rose-600">{error}</p>
        )}
        {locked && (
          <p className="mb-4 text-center text-sm text-amber-700">
            Locked for {formatRemaining(lockoutRemaining)}
          </p>
        )}

        <div className="mb-4 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              disabled={locked}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            disabled={locked}
            className="h-14 rounded-xl bg-slate-100 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => handleDigit('0')}
            disabled={locked}
            className="h-14 rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || locked || pin.length < MIN_PIN_LENGTH}
            className="h-14 rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Enter'}
          </button>
        </div>
      </div>
    </div>
  )
}
