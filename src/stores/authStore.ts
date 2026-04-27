import { create } from 'zustand'
import type { Staff, StaffRole } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import {
  generateId,
  generateSalt,
  hashPinLegacySHA256,
  hashPinPBKDF2,
  verifyPinPBKDF2,
} from '../lib/utils'
import {
  clearLoginFailures,
  isLoginLocked,
  isValidPinFormat,
  recordLoginFailure,
} from '../lib/security'

export type LoginResult =
  | { ok: true; user: Staff }
  | { ok: false; reason: 'invalid_pin' | 'locked' | 'invalid_format'; remainingMs?: number }

interface AuthState {
  currentUser: Staff | null
  staffList: Staff[]
  initialized: boolean
  login: (pin: string) => Promise<LoginResult>
  logout: () => void
  addStaff: (name: string, role: StaffRole, pin: string) => Promise<Staff | null>
  updateStaff: (id: string, updates: Partial<Pick<Staff, 'name' | 'role' | 'active'>>) => void
  deleteStaff: (id: string) => void
  changePin: (staffId: string, newPin: string) => Promise<boolean>
  initialize: () => Promise<void>
}

const DEFAULT_ADMIN_PIN = '1234'

async function createStaff(
  name: string,
  role: StaffRole,
  pin: string,
  mustChangePin: boolean,
): Promise<Staff> {
  const salt = generateSalt()
  const hash = await hashPinPBKDF2(pin, salt)
  return {
    id: generateId(),
    name,
    role,
    pin_hash: hash,
    pin_salt: salt,
    pin_algo: 'pbkdf2-sha256',
    active: true,
    must_change_pin: mustChangePin,
    created_at: new Date().toISOString(),
  }
}

// Fill in missing fields on staff records loaded from older localStorage snapshots.
function normalizeStaff(raw: Partial<Staff> & { pin_hash: string; name: string; role: StaffRole; id: string }): Staff {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    pin_hash: raw.pin_hash,
    pin_salt: raw.pin_salt ?? null,
    pin_algo: raw.pin_algo ?? (raw.pin_salt ? 'pbkdf2-sha256' : 'sha256-legacy'),
    active: raw.active ?? true,
    must_change_pin: raw.must_change_pin ?? false,
    created_at: raw.created_at ?? new Date().toISOString(),
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  staffList: [],
  initialized: false,

  initialize: async () => {
    const raw = getItem<Staff[]>('staff', [])
    let staffList = raw.map(normalizeStaff)
    if (staffList.length === 0) {
      const defaultAdmin = await createStaff('Admin', 'admin', DEFAULT_ADMIN_PIN, true)
      staffList = [defaultAdmin]
      setItem('staff', staffList)
    }
    set({ staffList, initialized: true })
  },

  login: async (pin: string) => {
    if (!isValidPinFormat(pin)) {
      return { ok: false, reason: 'invalid_format' }
    }
    const lock = isLoginLocked()
    if (lock.locked) {
      return { ok: false, reason: 'locked', remainingMs: lock.remainingMs }
    }

    for (const staff of get().staffList) {
      if (!staff.active) continue
      let matches = false
      if (staff.pin_algo === 'pbkdf2-sha256' && staff.pin_salt) {
        matches = await verifyPinPBKDF2(pin, staff.pin_salt, staff.pin_hash)
      } else {
        // Legacy SHA-256 (unsalted) — verify, then upgrade to PBKDF2 transparently
        const legacy = await hashPinLegacySHA256(pin)
        if (legacy === staff.pin_hash) {
          matches = true
          const salt = generateSalt()
          const newHash = await hashPinPBKDF2(pin, salt)
          const upgraded: Staff = {
            ...staff,
            pin_hash: newHash,
            pin_salt: salt,
            pin_algo: 'pbkdf2-sha256',
          }
          const updatedList = get().staffList.map((s) => (s.id === staff.id ? upgraded : s))
          set({ staffList: updatedList })
          setItem('staff', updatedList)
        }
      }
      if (matches) {
        clearLoginFailures()
        const fresh = get().staffList.find((s) => s.id === staff.id) ?? staff
        set({ currentUser: fresh })
        return { ok: true, user: fresh }
      }
    }

    const outcome = recordLoginFailure()
    return outcome.locked
      ? { ok: false, reason: 'locked', remainingMs: outcome.remainingMs }
      : { ok: false, reason: 'invalid_pin' }
  },

  logout: () => {
    set({ currentUser: null })
  },

  addStaff: async (name, role, pin) => {
    if (!isValidPinFormat(pin)) return null
    const staff = await createStaff(name.trim(), role, pin, false)
    const updated = [...get().staffList, staff]
    set({ staffList: updated })
    setItem('staff', updated)
    return staff
  },

  updateStaff: (id, updates) => {
    const updated = get().staffList.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    )
    set({ staffList: updated })
    setItem('staff', updated)
  },

  deleteStaff: (id) => {
    const updated = get().staffList.filter((s) => s.id !== id)
    set({ staffList: updated })
    setItem('staff', updated)
  },

  changePin: async (staffId, newPin) => {
    if (!isValidPinFormat(newPin)) return false
    const salt = generateSalt()
    const hash = await hashPinPBKDF2(newPin, salt)
    const updated = get().staffList.map((s) =>
      s.id === staffId
        ? {
            ...s,
            pin_hash: hash,
            pin_salt: salt,
            pin_algo: 'pbkdf2-sha256' as const,
            must_change_pin: false,
          }
        : s,
    )
    set({ staffList: updated })
    setItem('staff', updated)

    const current = get().currentUser
    if (current?.id === staffId) {
      const fresh = updated.find((s) => s.id === staffId) ?? null
      set({ currentUser: fresh })
    }
    return true
  },
}))
