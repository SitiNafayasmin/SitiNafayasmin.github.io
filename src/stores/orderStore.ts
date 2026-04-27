import { create } from 'zustand'
import type { Order, OrderStatus, CartItem, OrderType, PaymentMethod } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { generateId } from '../lib/utils'

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
  placeOrder: (params: {
    orderType: OrderType
    paymentMethod: PaymentMethod
    cashierId: string | null
    cashierName: string | null
    shiftId: string | null
    tableNumber: string | null
    notes: string | null
    taxRate: number
    discount: number
  }) => Order
  updateOrderStatus: (id: string, status: OrderStatus) => void
  cancelOrder: (id: string) => void
  initialize: () => void
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  cart: [],
  heldOrders: [],

  initialize: () => {
    const orders = getItem<Order[]>('orders', [])
    const heldOrders = getItem<{ id: string; cart: CartItem[]; label: string }[]>('held_orders', [])
    set({ orders, heldOrders })
  },

  addToCart: (item) => {
    const cart = get().cart
    const existing = cart.find((c) => c.product.id === item.product.id)
    if (existing) {
      set({
        cart: cart.map((c) =>
          c.product.id === item.product.id
            ? { ...c, quantity: c.quantity + item.quantity }
            : c,
        ),
      })
    } else {
      set({ cart: [...cart, item] })
    }
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId)
      return
    }
    set({
      cart: get().cart.map((c) =>
        c.product.id === productId ? { ...c, quantity } : c,
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
    const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
    const tax = subtotal * (params.taxRate / 100)
    const total = subtotal + tax - params.discount

    const orders = get().orders
    const orderNumber = orders.length > 0
      ? Math.max(...orders.map((o) => o.order_number)) + 1
      : 1

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
        price: c.product.price,
        quantity: c.quantity,
        notes: c.notes,
      })),
      subtotal,
      tax,
      discount: params.discount,
      total,
      payment_method: params.paymentMethod,
      cashier_id: params.cashierId,
      cashier_name: params.cashierName,
      shift_id: params.shiftId,
      table_number: params.tableNumber,
      notes: params.notes,
      created_at: new Date().toISOString(),
      completed_at: null,
    }
    order.items.forEach((item) => {
      item.order_id = order.id
    })

    const updated = [...orders, order]
    set({ orders: updated, cart: [] })
    setItem('orders', updated)

    // Notify other tabs
    try {
      const channel = new BroadcastChannel('xevora_pos')
      channel.postMessage({ type: 'NEW_ORDER', order })
      channel.close()
    } catch {
      // BroadcastChannel not supported
    }

    return order
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

    try {
      const channel = new BroadcastChannel('xevora_pos')
      channel.postMessage({ type: 'ORDER_UPDATED', orderId: id, status })
      channel.close()
    } catch {
      // BroadcastChannel not supported
    }
  },

  cancelOrder: (id) => {
    get().updateOrderStatus(id, 'cancelled')
  },
}))
