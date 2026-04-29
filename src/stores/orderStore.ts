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
  generateId,
  generatePickupCode,
  sanitizeTableId,
} from '../lib/utils'
import { sanitizeDiscount, sanitizePrice, sanitizeQuantity } from '../lib/security'

const CHANNEL_NAME = 'xevora_pos'
const DEFAULT_WAIT_MINUTES = 15

// Tracks whether we've already subscribed the module-level listener. This
// avoids stacking multiple listeners when multiple pages call initialize().
let channelAttached = false

interface CashierOrderParams {
  orderType: OrderType
  paymentMethod: PaymentMethod
  cashierId: string | null
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
  addToCart: (item: CartItem) => void
  updateCartQuantity: (productId: string, quantity: number) => void
  updateCartNotes: (productId: string, notes: string | null) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  holdOrder: (label: string) => void
  recallOrder: (holdId: string) => void
  deleteHeldOrder: (holdId: string) => void
  placeOrder: (params: CashierOrderParams) => Order | null
  placeCustomerOrder: (params: CustomerOrderParams) => Order | null
  approveCustomerOrder: (params: {
    orderId: string
    paymentMethod: PaymentMethod
    cashierId: string | null
    cashierName: string | null
    shiftId: string | null
    waitMinutes?: number
  }) => Order | null
  updateOrderStatus: (id: string, status: OrderStatus) => void
  cancelOrder: (id: string) => void
  refreshFromStorage: () => void
  initialize: () => void
}

function broadcast(message: { type: string; payload?: unknown }): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
  } catch {
    // BroadcastChannel not supported
  }
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

function nextOrderNumber(orders: Order[]): number {
  return orders.length > 0 ? Math.max(...orders.map((o) => o.order_number)) + 1 : 1
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  cart: [],
  heldOrders: [],

  refreshFromStorage: () => {
    const orders = getItem<Order[]>('orders', [])
    const heldOrders = getItem<{ id: string; cart: CartItem[]; label: string }[]>(
      'held_orders',
      [],
    )
    set({ orders, heldOrders })
  },

  initialize: () => {
    get().refreshFromStorage()
    if (channelAttached) return
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = () => {
        get().refreshFromStorage()
      }
      channelAttached = true
    } catch {
      // BroadcastChannel unsupported
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
    const holdEntry = { id: generateId(), cart: [...cart], label }
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

  placeOrder: (params) => {
    const cart = get().cart
    if (cart.length === 0) return null
    const { subtotal, tax, discount, total } = calcTotals(cart, params.taxRate, params.discount)

    const orders = get().orders
    const orderNumber = nextOrderNumber(orders)

    const order: Order = {
      id: generateId(),
      order_number: orderNumber,
      order_type: params.orderType,
      status: 'pending',
      items: cart.map((c) => ({
        id: generateId(),
        order_id: '',
        product_id: c.product.id,
        product_name: c.product.name,
        price: sanitizePrice(c.product.price),
        quantity: sanitizeQuantity(c.quantity),
        notes: c.notes,
      })),
      subtotal,
      tax,
      discount,
      total,
      payment_method: params.paymentMethod,
      cashier_id: params.cashierId,
      cashier_name: params.cashierName,
      shift_id: params.shiftId,
      table_number:
        params.orderType === 'dine_in' ? sanitizeTableId(params.tableNumber ?? '') || null : null,
      notes: params.notes,
      created_at: new Date().toISOString(),
      completed_at: null,
      source: 'cashier',
      pickup_code: null,
      approved_at: new Date().toISOString(),
      estimated_wait_minutes: null,
      customer_name: null,
    }
    order.items.forEach((item) => {
      item.order_id = order.id
    })

    const updated = [...orders, order]
    set({ orders: updated, cart: [] })
    setItem('orders', updated)
    broadcast({ type: 'NEW_ORDER', payload: order.id })
    return order
  },

  placeCustomerOrder: (params) => {
    if (params.items.length === 0) return null
    const safeTable = sanitizeTableId(params.tableNumber)
    if (!safeTable) return null

    const { subtotal, tax, total } = calcTotals(params.items, params.taxRate, 0)
    const orders = get().orders
    const orderNumber = nextOrderNumber(orders)

    const order: Order = {
      id: generateId(),
      order_number: orderNumber,
      order_type: 'dine_in',
      status: 'awaiting_payment',
      items: params.items.map((c) => ({
        id: generateId(),
        order_id: '',
        product_id: c.product.id,
        product_name: c.product.name,
        price: sanitizePrice(c.product.price),
        quantity: sanitizeQuantity(c.quantity),
        notes: c.notes,
      })),
      subtotal,
      tax,
      discount: 0,
      total,
      payment_method: null,
      cashier_id: null,
      cashier_name: null,
      shift_id: null,
      table_number: safeTable,
      notes: params.notes,
      created_at: new Date().toISOString(),
      completed_at: null,
      source: 'customer_qr',
      pickup_code: generatePickupCode(),
      approved_at: null,
      estimated_wait_minutes: null,
      customer_name: params.customerName?.slice(0, 64) ?? null,
    }
    order.items.forEach((item) => {
      item.order_id = order.id
    })

    const updated = [...orders, order]
    set({ orders: updated })
    setItem('orders', updated)
    broadcast({ type: 'NEW_CUSTOMER_ORDER', payload: order.id })
    return order
  },

  approveCustomerOrder: ({ orderId, paymentMethod, cashierId, cashierName, shiftId, waitMinutes }) => {
    const orders = get().orders
    const target = orders.find((o) => o.id === orderId)
    if (!target || target.status !== 'awaiting_payment') return null

    const approved: Order = {
      ...target,
      status: 'pending',
      payment_method: paymentMethod,
      cashier_id: cashierId,
      cashier_name: cashierName,
      shift_id: shiftId,
      approved_at: new Date().toISOString(),
      estimated_wait_minutes: clampNumber(
        waitMinutes ?? DEFAULT_WAIT_MINUTES,
        1,
        120,
        DEFAULT_WAIT_MINUTES,
      ),
    }
    const updated = orders.map((o) => (o.id === orderId ? approved : o))
    set({ orders: updated })
    setItem('orders', updated)
    broadcast({ type: 'ORDER_APPROVED', payload: orderId })
    return approved
  },

  updateOrderStatus: (id, status) => {
    const updated = get().orders.map((o) =>
      o.id === id
        ? {
            ...o,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : o.completed_at,
          }
        : o,
    )
    set({ orders: updated })
    setItem('orders', updated)
    broadcast({ type: 'ORDER_UPDATED', payload: { id, status } })
  },

  cancelOrder: (id) => {
    get().updateOrderStatus(id, 'cancelled')
  },
}))
