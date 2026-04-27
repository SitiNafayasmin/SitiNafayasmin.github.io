import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from '../lib/security'
import type { StaffRole } from '../lib/types'
import { t } from '../lib/i18n'

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}d`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}d`
}

export function Login() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const expectedRole: StaffRole | undefined =
    roleParam === 'admin' ? 'admin' : roleParam === 'cashier' ? 'cashier' : undefined

  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset)
  const authLoading = useAuthStore((s) => s.loading)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [resetSending, setResetSending] = useState(false)

  useEffect(() => {
    if (lockoutRemaining <= 0) return
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutRemaining])

  const locked = lockoutRemaining > 0

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')
    if (!isValidEmail(email)) {
      setError('Email tidak valid.')
      return
    }
    if (!isValidPassword(password)) {
      setError(`Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`)
      return
    }
    const result = await login(email, password, expectedRole)
    if (!result.ok) {
      switch (result.reason) {
        case 'locked':
          setLockoutRemaining(result.remainingMs ?? 0)
          setError(t.login.rateLimited)
          break
        case 'supabase_missing':
          setError(t.login.supabaseMissing)
          break
        case 'inactive':
          setError(t.login.accountInactive)
          break
        case 'wrong_role':
          setError(t.login.wrongRole)
          break
        case 'no_staff_row':
          setError('Akun Anda belum terdaftar sebagai staf.')
          break
        default:
          setError(t.login.invalidCredentials)
      }
      return
    }
    navigate(result.user.role === 'admin' ? '/admin' : '/cashier')
  }

  const handleReset = async () => {
    setError('')
    setInfo('')
    if (!isValidEmail(email)) {
      setError('Masukkan email Anda dulu.')
      return
    }
    setResetSending(true)
    const r = await sendPasswordReset(email)
    setResetSending(false)
    if (r.ok) setInfo(t.login.resetSent)
    else setError(r.message || t.login.resetFailed)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          {t.common.back}
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <Lock size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t.login.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.common.email}
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              required
              disabled={locked}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.common.password}
          </label>
          <input
            type="password"
            required
            disabled={locked}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.login.passwordPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetSending}
            className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            {t.login.forgot}
          </button>
        </div>

        {error && <p className="mb-3 text-center text-sm text-rose-600">{error}</p>}
        {info && <p className="mb-3 text-center text-sm text-emerald-700">{info}</p>}
        {locked && (
          <p className="mb-3 text-center text-sm text-amber-700">
            {t.login.rateLimited} ({formatRemaining(lockoutRemaining)})
          </p>
        )}

        <button
          type="submit"
          disabled={locked || authLoading}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {authLoading ? t.common.signingIn : t.login.submit}
        </button>
      </form>
    </div>
  )
}
