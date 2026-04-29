import { create } from 'zustand'
import type {
  CartItem,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import {
  clampNumber,
  generatePickupCode,
  sanitizeTableId,
} from '../lib/utils'
import { sanitizeDiscount, sanitizePrice, sanitizeQuantity } from '../lib/security'
import {
  fetchOrders,
  insertOrderWithItems,
  subscribeToTable,
  updateOrderRow,
} from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'

const DEFAULT_WAIT_MINUTES = 15

interface CashierOrderParams {
  orderType: OrderType
  paymentMethod: PaymentMethod
  cashierId: string | null
  cashierUserId: string | null
  cashierName: string | null
  shiftId: string | null
  tableNumber: string | null
  notes: string | null
  taxRate: number
  discount: number
}

interface CustomerOrderParams {
  tableNumber: string
  items: CartItem[]
  notes: string | null
  customerName: string | null
  taxRate: number
}

interface OrderState {
  orders: Order[]
  cart: CartItem[]
  heldOrders: { id: string; cart: CartItem[]; label: string }[]
  hydrated: boolean
  addToCart: (item: CartItem) => void
  updateCartQuantity: (productId: string, quantity: number) => void
  updateCartNotes: (productId: string, notes: string | null) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  holdOrder: (label: string) => void
  recallOrder: (holdId: string) => void
  deleteHeldOrder: (holdId: string) => void
  placeOrder: (params: CashierOrderParams) => Promise<Order | null>
  placeCustomerOrder: (params: CustomerOrderParams) => Promise<Order | null>
  approveCustomerOrder: (params: {
    orderId: string
    paymentMethod: PaymentMethod
    cashierId: string | null
    cashierUserId: string | null
    cashierName: string | null
    shiftId: string | null
    waitMinutes?: number
  }) => Promise<Order | null>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<boolean>
  cancelOrder: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
}

function calcTotals(items: CartItem[], taxRate: number, discount: number) {
  const subtotal = items.reduce(
    (sum, c) => sum + sanitizePrice(c.product.price) * sanitizeQuantity(c.quantity),
    0,
  )
  const tax = +(subtotal * (Math.max(0, taxRate) / 100)).toFixed(2)
  const safeDiscount = sanitizeDiscount(discount, subtotal)
  const total = +(subtotal + tax - safeDiscount).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), tax, discount: safeDiscount, total }
}

let ordersUnsub: (() => void) | null = null
let itemsUnsub: (() => void) | null = null

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  cart: [],
  heldOrders: [],
  hydrated: false,

  refresh: async () => {
    if (!isSupabaseConfigured) return
    const orders = await fetchOrders()
    set({ orders })
    setItem('orders', orders)
  },

  initialize: async () => {
    // Cart + held orders stay local (per-device state).
    const cachedOrders = getItem<Order[]>('orders', [])
    const heldOrders = getItem<{ id: string; cart: CartItem[]; label: string }[]>(
      'held_orders',
      [],
    )
    set({ orders: cachedOrders, heldOrders })

    if (!isSupabaseConfigured) {
      set({ hydrated: true })
      return
    }
    await get().refresh()
    set({ hydrated: true })

    if (!ordersUnsub) {
      ordersUnsub = subscribeToTable('orders', () => get().refresh())
    }
    if (!itemsUnsub) {
      itemsUnsub = subscribeToTable('order_items', () => get().refresh())
    }
  },

  addToCart: (item) => {
    const cart = get().cart
    const existing = cart.find((c) => c.product.id === item.product.id)
    const qty = sanitizeQuantity(item.quantity)
    if (existing) {
      set({
        cart: cart.map((c) =>
          c.product.id === item.product.id
            ? { ...c, quantity: sanitizeQuantity(c.quantity + qty) }
            : c,
        ),
      })
    } else {
      set({ cart: [...cart, { ...item, quantity: qty }] })
    }
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId)
      return
    }
    set({
      cart: get().cart.map((c) =>
        c.product.id === productId ? { ...c, quantity: sanitizeQuantity(quantity) } : c,
      ),
    })
  },

  updateCartNotes: (productId, notes) => {
    set({
      cart: get().cart.map((c) =>
        c.product.id === productId ? { ...c, notes } : c,
      ),
    })
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((c) => c.product.id !== productId) })
  },

  clearCart: () => set({ cart: [] }),

  holdOrder: (label) => {
    const cart = get().cart
    if (cart.length === 0) return
    const holdEntry = { id: crypto.randomUUID(), cart: [...cart], label }
    const updated = [...get().heldOrders, holdEntry]
    set({ heldOrders: updated, cart: [] })
    setItem('held_orders', updated)
  },

  recallOrder: (holdId) => {
    const held = get().heldOrders.find((h) => h.id === holdId)
    if (!held) return
    const remaining = get().heldOrders.filter((h) => h.id !== holdId)
    set({ cart: held.cart, heldOrders: remaining })
    setItem('held_orders', remaining)
  },

  deleteHeldOrder: (holdId) => {
    const remaining = get().heldOrders.filter((h) => h.id !== holdId)
    set({ heldOrders: remaining })
    setItem('held_orders', remaining)
  },

  placeOrder: async (params) => {
    const cart = get().cart
    if (cart.length === 0) return null
    if (!isSupabaseConfigured) return null
    const { subtotal, tax, discount, total } = calcTotals(cart, params.taxRate, params.discount)

    const row = await insertOrderWithItems({
      order: {
        id: crypto.randomUUID(),
        order_type: params.orderType,
        status: 'pending',
        subtotal,
        tax,
        discount,
        total,
        payment_method: params.paymentMethod,
        cashier_id: params.cashierId,
        cashier_user_id: params.cashierUserId,
        cashier_name: params.cashierName,
        shift_id: params.shiftId,
        table_number:
          params.orderType === 'dine_in'
            ? sanitizeTableId(params.tableNumber ?? '') || null
            : null,
        notes: params.notes,
        source: 'cashier',
        pickup_code: null,
        approved_at: new Date().toISOString(),
        estimated_wait_minutes: null,
        customer_name: null,
      },
      items: cart.map((c) => ({
        product_id: c.product.id,
        product_name: c.product.name,
        price: sanitizePrice(c.product.price),
        quantity: sanitizeQuantity(c.quantity),
        notes: c.notes,
      })),
    })
    if (!row) return null
    set({ cart: [] })
    await get().refresh()
    return row
  },

  placeCustomerOrder: async (params) => {
    if (params.items.length === 0) return null
    const safeTable = sanitizeTableId(params.tableNumber)
    if (!safeTable) return null
    if (!isSupabaseConfigured) return null

    const { subtotal, tax, total } = calcTotals(params.items, params.taxRate, 0)

    const row = await insertOrderWithItems({
      order: {
        id: crypto.randomUUID(),
        order_type: 'dine_in',
        status: 'awaiting_payment',
        subtotal,
        tax,
        discount: 0,
        total,
        payment_method: null,
        cashier_id: null,
        cashier_user_id: null,
        cashier_name: null,
        shift_id: null,
        table_number: safeTable,
        notes: params.notes,
        source: 'customer_qr',
        pickup_code: generatePickupCode(),
        approved_at: null,
        estimated_wait_minutes: null,
        customer_name: params.customerName?.slice(0, 64) ?? null,
      },
      items: params.items.map((c) => ({
        product_id: c.product.id,
        product_name: c.product.name,
        price: sanitizePrice(c.product.price),
        quantity: sanitizeQuantity(c.quantity),
        notes: c.notes,
      })),
    })
    if (!row) return null
    await get().refresh()
    return row
  },

  approveCustomerOrder: async ({
    orderId,
    paymentMethod,
    cashierId,
    cashierUserId,
    cashierName,
    shiftId,
    waitMinutes,
  }) => {
    const order = get().orders.find((o) => o.id === orderId)
    if (!order || order.status !== 'awaiting_payment') return null
    const row = await updateOrderRow(orderId, {
      status: 'pending',
      payment_method: paymentMethod,
      cashier_id: cashierId,
      cashier_user_id: cashierUserId,
      cashier_name: cashierName,
      shift_id: shiftId,
      approved_at: new Date().toISOString(),
      estimated_wait_minutes: clampNumber(
        waitMinutes ?? DEFAULT_WAIT_MINUTES,
        1,
        120,
        DEFAULT_WAIT_MINUTES,
      ),
    })
    if (!row) return null
    await get().refresh()
    return row
  },

  updateOrderStatus: async (id, status) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    const row = await updateOrderRow(id, updates)
    if (!row) return false
    await get().refresh()
    return true
  },

  cancelOrder: async (id) => {
    return get().updateOrderStatus(id, 'cancelled')
  },
}))
