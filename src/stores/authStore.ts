import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { Staff, StaffRole } from '../lib/types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from '../lib/security'

export type LoginReason =
  | 'invalid_credentials'
  | 'locked'
  | 'supabase_missing'
  | 'inactive'
  | 'no_staff_row'
  | 'wrong_role'
  | 'unknown'

export type LoginResult =
  | { ok: true; user: Staff }
  | { ok: false; reason: LoginReason; remainingMs?: number; message?: string }

interface AuthState {
  currentUser: Staff | null
  staffList: Staff[]
  session: Session | null
  initialized: boolean
  loading: boolean
  login: (email: string, password: string, expectedRole?: StaffRole) => Promise<LoginResult>
  logout: () => Promise<void>
  inviteStaff: (
    email: string,
    name: string,
    role: StaffRole,
  ) => Promise<{ ok: true; staff: Staff } | { ok: false; message: string }>
  updateStaff: (
    id: string,
    updates: Partial<Pick<Staff, 'name' | 'role' | 'active'>>,
  ) => Promise<boolean>
  deleteStaff: (id: string) => Promise<boolean>
  sendPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; message: string }>
  updatePassword: (newPassword: string) => Promise<{ ok: true } | { ok: false; message: string }>
  refreshStaffList: () => Promise<void>
  initialize: () => Promise<void>
}

async function fetchStaffByUserId(userId: string): Promise<Staff | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as Staff
}

async function fetchStaffByEmail(email: string): Promise<Staff | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error || !data) return null
  return data as Staff
}

async function fetchAllStaff(): Promise<Staff[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as Staff[]
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  staffList: [],
  session: null,
  initialized: false,
  loading: false,

  initialize: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true })
      return
    }
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (session) {
      const staff =
        (await fetchStaffByUserId(session.user.id)) ??
        (session.user.email ? await fetchStaffByEmail(session.user.email) : null)
      set({ session, currentUser: staff ?? null })
    }
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        set({ session: null, currentUser: null })
        return
      }
      const staff =
        (await fetchStaffByUserId(newSession.user.id)) ??
        (newSession.user.email ? await fetchStaffByEmail(newSession.user.email) : null)
      set({ session: newSession, currentUser: staff ?? null })
    })
    if (get().currentUser?.role === 'admin') {
      const all = await fetchAllStaff()
      set({ staffList: all })
    }
    set({ initialized: true })
  },

  login: async (email, password, expectedRole) => {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, reason: 'supabase_missing' }
    }
    const lock = isLoginLocked()
    if (lock.locked) {
      return { ok: false, reason: 'locked', remainingMs: lock.remainingMs }
    }
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error || !data.session) {
      set({ loading: false })
      const outcome = recordLoginFailure()
      if (outcome.locked) {
        return { ok: false, reason: 'locked', remainingMs: outcome.remainingMs }
      }
      return { ok: false, reason: 'invalid_credentials' }
    }
    const staff =
      (await fetchStaffByUserId(data.session.user.id)) ??
      (data.session.user.email ? await fetchStaffByEmail(data.session.user.email) : null)
    if (!staff) {
      await supabase.auth.signOut()
      set({ loading: false })
      return { ok: false, reason: 'no_staff_row' }
    }
    if (!staff.active) {
      await supabase.auth.signOut()
      set({ loading: false })
      return { ok: false, reason: 'inactive' }
    }
    if (expectedRole && staff.role !== expectedRole) {
      await supabase.auth.signOut()
      set({ loading: false })
      return { ok: false, reason: 'wrong_role' }
    }
    clearLoginFailures()
    set({ session: data.session, currentUser: staff, loading: false })
    if (staff.role === 'admin') {
      const all = await fetchAllStaff()
      set({ staffList: all })
    }
    return { ok: true, user: staff }
  },

  logout: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ session: null, currentUser: null, staffList: [] })
  },

  inviteStaff: async (email, name, role) => {
    if (!supabase) return { ok: false, message: 'Supabase belum dikonfigurasi.' }
    const session = get().session
    if (!session) return { ok: false, message: 'Sesi tidak ditemukan.' }
    try {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
        },
      })
      if (error) {
        return { ok: false, message: error.message || 'Gagal mengundang staf.' }
      }
      const staff = data?.staff as Staff | undefined
      if (!staff) return { ok: false, message: 'Server tidak mengembalikan data staf.' }
      const current = get().staffList
      const merged = [...current.filter((s) => s.id !== staff.id), staff]
      set({ staffList: merged })
      return { ok: true, staff }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Kesalahan tidak dikenal.' }
    }
  },

  updateStaff: async (id, updates) => {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error || !data) return false
    const staff = data as Staff
    const current = get().staffList.map((s) => (s.id === id ? staff : s))
    set({ staffList: current })
    return true
  },

  deleteStaff: async (id) => {
    if (!supabase) return false
    try {
      const { error } = await supabase.functions.invoke('invite-staff', {
        body: { action: 'delete', staffId: id },
      })
      if (error) return false
      set({ staffList: get().staffList.filter((s) => s.id !== id) })
      return true
    } catch {
      return false
    }
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { ok: false, message: 'Supabase belum dikonfigurasi.' }
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { ok: false, message: 'Supabase belum dikonfigurasi.' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  },

  refreshStaffList: async () => {
    if (!supabase) return
    if (get().currentUser?.role !== 'admin') return
    const all = await fetchAllStaff()
    set({ staffList: all })
  },
}))
