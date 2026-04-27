import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { isValidPassword, MIN_PASSWORD_LENGTH } from '../lib/security'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

export function ResetPassword() {
  const navigate = useNavigate()
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string>(() =>
    supabase ? '' : t.login.supabaseMissing,
  )
  const [info, setInfo] = useState('')

  // Supabase puts a session in the URL hash (#access_token=...) when the user
  // clicks an invitation / reset email. The SDK picks this up automatically on
  // load; we just wait for the session to be ready before allowing submission.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) {
        setReady(true)
      } else {
        setError(
          'Tautan tidak valid atau sudah kedaluwarsa. Minta admin untuk mengundang ulang.',
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!isValidPassword(newPassword)) {
      setError(`${t.setPassword.tooShort} (min. ${MIN_PASSWORD_LENGTH})`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.setPassword.mismatch)
      return
    }
    const r = await updatePassword(newPassword)
    if (!r.ok) {
      setError(r.message)
      return
    }
    setInfo(t.setPassword.success)
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <KeyRound size={28} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t.setPassword.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.setPassword.subtitle}</p>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.setPassword.newPassword}
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t.setPassword.confirmPassword}
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {error && <p className="mb-3 text-center text-sm text-rose-600">{error}</p>}
        {info && <p className="mb-3 text-center text-sm text-emerald-700">{info}</p>}

        <button
          type="submit"
          disabled={!ready}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {t.setPassword.submit}
        </button>
      </form>
    </div>
  )
}
