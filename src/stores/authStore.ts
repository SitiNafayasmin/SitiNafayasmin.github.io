import { create } from 'zustand'
import type { Staff, StaffRole } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { generateId, hashPin } from '../lib/utils'

interface AuthState {
  currentUser: Staff | null
  staffList: Staff[]
  initialized: boolean
  login: (pin: string) => Promise<Staff | null>
  logout: () => void
  addStaff: (name: string, role: StaffRole, pin: string) => Promise<Staff>
  updateStaff: (id: string, updates: Partial<Pick<Staff, 'name' | 'role' | 'active'>>) => void
  deleteStaff: (id: string) => void
  initialize: () => Promise<void>
}

const DEFAULT_ADMIN_PIN = '1234'

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  staffList: [],
  initialized: false,

  initialize: async () => {
    let staffList = getItem<Staff[]>('staff', [])
    if (staffList.length === 0) {
      const adminHash = await hashPin(DEFAULT_ADMIN_PIN)
      const defaultAdmin: Staff = {
        id: generateId(),
        name: 'Admin',
        role: 'admin',
        pin_hash: adminHash,
        active: true,
        created_at: new Date().toISOString(),
      }
      staffList = [defaultAdmin]
      setItem('staff', staffList)
    }
    set({ staffList, initialized: true })
  },

  login: async (pin: string) => {
    const pinHash = await hashPin(pin)
    const staff = get().staffList.find(
      (s) => s.pin_hash === pinHash && s.active,
    )
    if (staff) {
      set({ currentUser: staff })
      return staff
    }
    return null
  },

  logout: () => {
    set({ currentUser: null })
  },

  addStaff: async (name, role, pin) => {
    const pinHash = await hashPin(pin)
    const staff: Staff = {
      id: generateId(),
      name,
      role,
      pin_hash: pinHash,
      active: true,
      created_at: new Date().toISOString(),
    }
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
}))
