import { create } from 'zustand'
import type { Settings } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'

interface SettingsState {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  initialize: () => void
}

const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  business_name: 'Xevora POS',
  address: '',
  tax_rate: 6,
  receipt_footer: 'Thank you for your purchase!',
  currency: 'MYR',
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (updates) => {
    const updated = { ...get().settings, ...updates }
    set({ settings: updated })
    setItem('settings', updated)
  },

  initialize: () => {
    const settings = getItem<Settings>('settings', DEFAULT_SETTINGS)
    set({ settings })
  },
}))
