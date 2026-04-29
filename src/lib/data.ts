// Supabase data-access layer.
//
// Phase A: the app is Supabase-primary. Stores hydrate from the database on
// startup and subscribe to Realtime changes so updates propagate across
// devices. localStorage is used purely as a last-resort cache for first
// paint when Supabase is briefly unreachable.
//
// All writes go through this module. When Supabase is not configured the
// functions return sensible no-op defaults so the UI does not crash (useful
// for local preview / tests).

import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  Category,
  Order,
  OrderStatus,
  Product,
  Settings,
  Table,
} from './types'
import { supabase } from './supabase'

// --------------------------------------------------------------------------
// Row shapes (as returned by Supabase). `order_items` are fetched separately
// and grafted onto the order object in code.
// --------------------------------------------------------------------------

interface OrderRow {
  id: string
  order_number: number
  order_type: Order['order_type']
  status: OrderStatus
  subtotal: number | string
  tax: number | string
  discount: number | string
  total: number | string
  payment_method: Order['payment_method']
  cashier_id: string | null
  cashier_user_id: string | null
  cashier_name: string | null
  shift_id: string | null
  table_number: string | null
  notes: string | null
  source: Order['source']
  pickup_code: string | null
  approved_at: string | null
  estimated_wait_minutes: number | null
  customer_name: string | null
  created_at: string
  completed_at: string | null
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  price: number | string
  quantity: number
  notes: string | null
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

function normalizeOrder(row: OrderRow, items: OrderItemRow[] = []): Order {
  return {
    id: row.id,
    order_number: row.order_number,
    order_type: row.order_type,
    status: row.status,
    items: items.map((i) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id ?? '',
      product_name: i.product_name,
      price: toNumber(i.price),
      quantity: i.quantity,
      notes: i.notes,
    })),
    subtotal: toNumber(row.subtotal),
    tax: toNumber(row.tax),
    discount: toNumber(row.discount),
    total: toNumber(row.total),
    payment_method: row.payment_method,
    cashier_id: row.cashier_id,
    cashier_name: row.cashier_name,
    shift_id: row.shift_id,
    table_number: row.table_number,
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    source: row.source,
    pickup_code: row.pickup_code,
    approved_at: row.approved_at,
    estimated_wait_minutes: row.estimated_wait_minutes,
    customer_name: row.customer_name,
  }
}

// --------------------------------------------------------------------------
// Categories
// --------------------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error || !data) return []
  return data as Category[]
}

export async function insertCategory(
  input: Pick<Category, 'name' | 'color' | 'sort_order'>,
): Promise<Category | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return data as Category
}

export async function updateCategoryRow(
  id: string,
  updates: Partial<Category>,
): Promise<Category | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return data as Category
}

export async function deleteCategoryRow(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('categories').delete().eq('id', id)
  return !error
}

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as Product[]).map((p) => ({ ...p, category_id: p.category_id ?? '' }))
}

export async function insertProduct(
  input: Omit<Product, 'id' | 'created_at'>,
): Promise<Product | null> {
  if (!supabase) return null
  const payload = { ...input, category_id: input.category_id || null }
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return { ...(data as Product), category_id: (data as Product).category_id ?? '' }
}

export async function updateProductRow(
  id: string,
  updates: Partial<Product>,
): Promise<Product | null> {
  if (!supabase) return null
  const payload: Partial<Product> = { ...updates }
  if (Object.prototype.hasOwnProperty.call(updates, 'category_id')) {
    payload.category_id = (updates.category_id || null) as string
  }
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return { ...(data as Product), category_id: (data as Product).category_id ?? '' }
}

export async function deleteProductRow(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('products').delete().eq('id', id)
  return !error
}

// --------------------------------------------------------------------------
// Tables
// --------------------------------------------------------------------------

export async function fetchTables(): Promise<Table[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('label', { ascending: true })
  if (error || !data) return []
  return data as Table[]
}

export async function insertTable(label: string): Promise<Table | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tables')
    .insert({ label, active: true })
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return data as Table
}

export async function updateTableRow(
  id: string,
  updates: Partial<Pick<Table, 'label' | 'active'>>,
): Promise<Table | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tables')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return data as Table
}

export async function deleteTableRow(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('tables').delete().eq('id', id)
  return !error
}

// --------------------------------------------------------------------------
// Settings
// --------------------------------------------------------------------------

export async function fetchSettings(): Promise<Settings | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()
  if (error || !data) return null
  const row = data as Settings & { tax_rate: number | string }
  return { ...row, tax_rate: toNumber(row.tax_rate) }
}

export async function updateSettingsRow(
  updates: Partial<Settings>,
): Promise<Settings | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('settings')
    .update(updates)
    .eq('id', 'default')
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  const row = data as Settings & { tax_rate: number | string }
  return { ...row, tax_rate: toNumber(row.tax_rate) }
}

// --------------------------------------------------------------------------
// Orders
// --------------------------------------------------------------------------

export async function fetchOrders(limit = 200): Promise<Order[]> {
  if (!supabase) return []
  const { data: orderRows, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (ordersErr || !orderRows) return []
  const orderIds = (orderRows as OrderRow[]).map((o) => o.id)
  if (orderIds.length === 0) return []
  const { data: itemRows } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)
  const itemsByOrder: Record<string, OrderItemRow[]> = {}
  ;((itemRows as OrderItemRow[]) ?? []).forEach((it) => {
    if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
    itemsByOrder[it.order_id].push(it)
  })
  return (orderRows as OrderRow[]).map((row) => normalizeOrder(row, itemsByOrder[row.id] ?? []))
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  if (!supabase) return null
  const { data: row } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (!row) return null
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id)
  return normalizeOrder(row as OrderRow, (items as OrderItemRow[]) ?? [])
}

interface InsertOrderInput {
  order: Omit<OrderRow, 'order_number' | 'created_at' | 'completed_at'> & {
    id?: string
    created_at?: string
  }
  items: Array<Omit<OrderItemRow, 'id' | 'order_id'>>
}

export async function insertOrderWithItems(
  input: InsertOrderInput,
): Promise<Order | null> {
  if (!supabase) return null
  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert(input.order)
    .select('*')
    .maybeSingle()
  if (orderErr || !orderRow) return null
  const createdOrder = orderRow as OrderRow
  if (input.items.length === 0) return normalizeOrder(createdOrder, [])
  const itemsPayload = input.items.map((it) => ({ ...it, order_id: createdOrder.id }))
  const { data: itemRows, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsPayload)
    .select('*')
  if (itemsErr) {
    // Best-effort rollback so we don't orphan an empty order.
    await supabase.from('orders').delete().eq('id', createdOrder.id)
    return null
  }
  return normalizeOrder(createdOrder, (itemRows as OrderItemRow[]) ?? [])
}

export async function updateOrderRow(
  id: string,
  updates: Partial<OrderRow>,
): Promise<Order | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error || !data) return null
  return fetchOrderById(id)
}

// --------------------------------------------------------------------------
// Realtime subscriptions. Each helper returns a cleanup function that
// removes the channel; callers should invoke it when unmounting.
// --------------------------------------------------------------------------

type TableName =
  | 'categories'
  | 'products'
  | 'tables'
  | 'settings'
  | 'orders'
  | 'order_items'
  | 'shifts'

export function subscribeToTable(table: TableName, onChange: () => void): () => void {
  if (!supabase) return () => undefined
  const channel: RealtimeChannel = supabase
    .channel(`rt-${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}

export function subscribeToOrder(id: string, onChange: () => void): () => void {
  if (!supabase) return () => undefined
  const channel: RealtimeChannel = supabase
    .channel(`rt-order-${id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}

// --------------------------------------------------------------------------
// Storage (menu photos)
// --------------------------------------------------------------------------

export async function uploadMenuPhoto(file: File): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('menu-photos')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path)
  return data.publicUrl ?? null
}
