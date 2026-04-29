import { create } from 'zustand'
import type { Table } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { sanitizeTableId } from '../lib/utils'
import {
  deleteTableRow,
  fetchTables,
  insertTable,
  subscribeToTable,
  updateTableRow,
} from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'

interface TableState {
  tables: Table[]
  hydrated: boolean
  addTable: (label: string) => Promise<Table | null>
  updateTable: (
    id: string,
    updates: Partial<Pick<Table, 'label' | 'active'>>,
  ) => Promise<boolean>
  deleteTable: (id: string) => Promise<boolean>
  initialize: () => Promise<void>
}

let unsubscribe: (() => void) | null = null

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],
  hydrated: false,

  addTable: async (label) => {
    const clean = sanitizeTableId(label)
    if (!clean) return null
    if (get().tables.some((t) => t.label.toLowerCase() === clean.toLowerCase())) return null
    if (!isSupabaseConfigured) return null
    const row = await insertTable(clean)
    if (!row) return null
    const updated = [...get().tables, row]
    set({ tables: updated })
    setItem('tables', updated)
    return row
  },

  updateTable: async (id, updates) => {
    const cleaned = updates.label !== undefined
      ? { ...updates, label: sanitizeTableId(updates.label) }
      : updates
    if (!isSupabaseConfigured) return false
    const row = await updateTableRow(id, cleaned)
    if (!row) return false
    const updated = get().tables.map((t) => (t.id === id ? row : t))
    set({ tables: updated })
    setItem('tables', updated)
    return true
  },

  deleteTable: async (id) => {
    if (!isSupabaseConfigured) return false
    const ok = await deleteTableRow(id)
    if (!ok) return false
    const updated = get().tables.filter((t) => t.id !== id)
    set({ tables: updated })
    setItem('tables', updated)
    return true
  },

  initialize: async () => {
    const cached = getItem<Table[]>('tables', [])
    if (cached.length > 0) set({ tables: cached })

    if (!isSupabaseConfigured) {
      set({ hydrated: true })
      return
    }

    const fresh = await fetchTables()
    set({ tables: fresh, hydrated: true })
    setItem('tables', fresh)

    if (!unsubscribe) {
      unsubscribe = subscribeToTable('tables', async () => {
        const latest = await fetchTables()
        set({ tables: latest })
        setItem('tables', latest)
      })
    }
  },
}))
