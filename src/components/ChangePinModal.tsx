import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { isValidPinFormat, MAX_PIN_LENGTH, MIN_PIN_LENGTH } from '../lib/security'
import { Button, Card, Input } from './ui/primitives'

/**
 * Blocks the app until a user with must_change_pin=true picks a new PIN.
 * Called from protected routes via a wrapper so the user can't bypass it.
 */
export function ChangePinModal({ onComplete }: { onComplete: () => void }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const changePin = useAuthStore((s) => s.changePin)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!currentUser) return null

  const handleSave = async () => {
    setError('')
    if (!isValidPinFormat(pin)) {
      setError(`PIN must be ${MIN_PIN_LENGTH}–${MAX_PIN_LENGTH} digits.`)
      return
    }
    if (pin !== confirm) {
      setError('PINs do not match.')
      return
    }
    if (pin === '1234') {
      setError('Please choose a less common PIN.')
      return
    }
    setSaving(true)
    const ok = await changePin(currentUser.id, pin)
    setSaving(false)
    if (!ok) {
      setError('Could not update PIN. Try again.')
      return
    }
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-indigo-100 p-2.5 text-indigo-700">
            <Lock size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Set a new PIN</h2>
            <p className="text-xs text-slate-500">
              For security, please replace the default PIN before continuing.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              New PIN ({MIN_PIN_LENGTH}–{MAX_PIN_LENGTH} digits)
            </label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, MAX_PIN_LENGTH))}
              autoFocus
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Confirm new PIN
            </label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, MAX_PIN_LENGTH))}
              inputMode="numeric"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save PIN'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
