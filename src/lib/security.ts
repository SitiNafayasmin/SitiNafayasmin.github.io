import { getItem, setItem } from './localStorage'

export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
export const MIN_PASSWORD_LENGTH = 8

interface LoginLockout {
  failures: number
  firstFailureAt: number
  lockedUntil: number | null
}

const LOCKOUT_KEY = 'login_lockout'

function getLockout(): LoginLockout {
  return getItem<LoginLockout>(LOCKOUT_KEY, {
    failures: 0,
    firstFailureAt: 0,
    lockedUntil: null,
  })
}

function setLockout(l: LoginLockout): void {
  setItem(LOCKOUT_KEY, l)
}

export function isLoginLocked(): { locked: boolean; remainingMs: number } {
  const l = getLockout()
  if (!l.lockedUntil) return { locked: false, remainingMs: 0 }
  const remaining = l.lockedUntil - Date.now()
  if (remaining <= 0) {
    setLockout({ failures: 0, firstFailureAt: 0, lockedUntil: null })
    return { locked: false, remainingMs: 0 }
  }
  return { locked: true, remainingMs: remaining }
}

export function recordLoginFailure(): { locked: boolean; remainingMs: number } {
  const now = Date.now()
  const l = getLockout()
  // Reset the window if the last failure was more than LOGIN_LOCKOUT_MS ago
  const failures = now - l.firstFailureAt > LOGIN_LOCKOUT_MS ? 1 : l.failures + 1
  const firstFailureAt = failures === 1 ? now : l.firstFailureAt
  const lockedUntil = failures >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCKOUT_MS : null
  setLockout({ failures, firstFailureAt, lockedUntil })
  return { locked: lockedUntil !== null, remainingMs: lockedUntil ? lockedUntil - now : 0 }
}

export function clearLoginFailures(): void {
  setLockout({ failures: 0, firstFailureAt: 0, lockedUntil: null })
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
}

/** Validate a discount amount against a subtotal; never negative, never > subtotal. */
export function sanitizeDiscount(raw: number, subtotal: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0
  if (raw > subtotal) return subtotal
  return raw
}

/** Validate a quantity: positive integer, capped. */
export function sanitizeQuantity(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(999, Math.floor(raw))
}

/** Validate a price: non-negative, reasonable ceiling. */
export function sanitizePrice(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0
  return Math.min(1_000_000, raw)
}
