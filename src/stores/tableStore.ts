import { create } from 'zustand'
import type { Table } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { generateId, sanitizeTableId } from '../lib/utils'

interface TableState {
  tables: Table[]
  addTable: (label: string) => Table | null
  updateTable: (id: string, updates: Partial<Pick<Table, 'label' | 'active'>>) => void
  deleteTable: (id: string) => void
  initialize: () => void
}

const DEFAULT_TABLES = ['1', '2', '3', '4', '5']

function makeTable(label: string): Table {
  return {
    id: generateId(),
    label: sanitizeTableId(label),
    active: true,
    created_at: new Date().toISOString(),
  }
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],

  initialize: () => {
    let tables = getItem<Table[]>('tables', [])
    if (tables.length === 0) {
      tables = DEFAULT_TABLES.map(makeTable)
      setItem('tables', tables)
    }
    set({ tables })
  },

  addTable: (label) => {
    const clean = sanitizeTableId(label)
    if (!clean) return null
    if (get().tables.some((t) => t.label.toLowerCase() === clean.toLowerCase())) return null
    const table = makeTable(clean)
    const updated = [...get().tables, table]
    set({ tables: updated })
    setItem('tables', updated)
    return table
  },

  updateTable: (id, updates) => {
    const cleaned = updates.label !== undefined
      ? { ...updates, label: sanitizeTableId(updates.label) }
      : updates
    const updated = get().tables.map((t) => (t.id === id ? { ...t, ...cleaned } : t))
    set({ tables: updated })
    setItem('tables', updated)
  },

  deleteTable: (id) => {
    const updated = get().tables.filter((t) => t.id !== id)
    set({ tables: updated })
    setItem('tables', updated)
  },
}))
