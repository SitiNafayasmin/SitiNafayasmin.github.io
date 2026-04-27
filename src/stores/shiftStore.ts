import { create } from 'zustand'
import type { Shift } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { generateId } from '../lib/utils'

interface ShiftState {
  shifts: Shift[]
  activeShift: Shift | null
  clockIn: (cashierId: string, cashierName: string) => Shift
  clockOut: () => Shift | null
  updateShiftSales: (amount: number) => void
  initialize: () => void
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  activeShift: null,

  initialize: () => {
    const shifts = getItem<Shift[]>('shifts', [])
    const active = shifts.find((s) => s.status === 'active') ?? null
    set({ shifts, activeShift: active })
  },

  clockIn: (cashierId, cashierName) => {
    const shift: Shift = {
      id: generateId(),
      cashier_id: cashierId,
      cashier_name: cashierName,
      start_time: new Date().toISOString(),
      end_time: null,
      total_sales: 0,
      order_count: 0,
      status: 'active',
    }
    const updated = [...get().shifts, shift]
    set({ shifts: updated, activeShift: shift })
    setItem('shifts', updated)
    return shift
  },

  clockOut: () => {
    const active = get().activeShift
    if (!active) return null
    const closedShift: Shift = {
      ...active,
      end_time: new Date().toISOString(),
      status: 'closed',
    }
    const updated = get().shifts.map((s) =>
      s.id === active.id ? closedShift : s,
    )
    set({ shifts: updated, activeShift: null })
    setItem('shifts', updated)
    return closedShift
  },

  updateShiftSales: (amount) => {
    const active = get().activeShift
    if (!active) return
    const updatedShift: Shift = {
      ...active,
      total_sales: active.total_sales + amount,
      order_count: active.order_count + 1,
    }
    const updated = get().shifts.map((s) =>
      s.id === active.id ? updatedShift : s,
    )
    set({ shifts: updated, activeShift: updatedShift })
    setItem('shifts', updated)
  },
}))
