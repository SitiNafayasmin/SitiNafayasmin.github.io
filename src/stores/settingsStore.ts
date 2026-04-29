import { create } from 'zustand'
import type { Settings } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { fetchSettings, subscribeToTable, updateSettingsRow } from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'

interface SettingsState {
  settings: Settings
  /** True once we have hydrated from Supabase at least once this session. */
  hydrated: boolean
  updateSettings: (updates: Partial<Settings>) => Promise<boolean>
  initialize: () => Promise<void>
}

const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  business_name: 'Xevora POS',
  address: '',
  tax_rate: 11,
  receipt_footer: 'Terima kasih atas kunjungan Anda!',
  currency: 'IDR',
  default_wait_minutes: 15,
}

let unsubscribe: (() => void) | null = null

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  updateSettings: async (updates) => {
    const previous = get().settings
    const next = { ...previous, ...updates }
    // Optimistic local update + localStorage cache.
    set({ settings: next })
    setItem('settings', next)
    if (!isSupabaseConfigured) return true
    const saved = await updateSettingsRow(updates)
    if (!saved) {
      // Roll back on failure.
      set({ settings: previous })
      setItem('settings', previous)
      return false
    }
    set({ settings: saved })
    setItem('settings', saved)
    return true
  },

  initialize: async () => {
    // First paint: hydrate from local cache if available.
    const cached = getItem<Partial<Settings>>('settings', DEFAULT_SETTINGS)
    set({ settings: { ...DEFAULT_SETTINGS, ...cached } })

    if (!isSupabaseConfigured) {
      set({ hydrated: true })
      return
    }

    const fresh = await fetchSettings()
    if (fresh) {
      set({ settings: fresh })
      setItem('settings', fresh)
    }
    set({ hydrated: true })

    // Subscribe once; re-fetch on any change so all devices stay in sync.
    if (!unsubscribe) {
      unsubscribe = subscribeToTable('settings', async () => {
        const latest = await fetchSettings()
        if (latest) {
          set({ settings: latest })
          setItem('settings', latest)
        }
      })
    }
  },
}))
