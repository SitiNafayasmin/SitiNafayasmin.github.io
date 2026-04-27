export interface Category {
  id: string
  name: string
  sort_order: number
  color: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  price: number
  category_id: string
  image_url: string | null
  sku: string | null
  available: boolean
  created_at: string
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'card' | 'ewallet'
export type OrderSource = 'cashier' | 'customer_qr'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  notes: string | null
}

export interface Order {
  id: string
  order_number: number
  order_type: OrderType
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method: PaymentMethod | null
  cashier_id: string | null
  cashier_name: string | null
  shift_id: string | null
  table_number: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
  source: OrderSource
  pickup_code: string | null
  approved_at: string | null
  estimated_wait_minutes: number | null
  customer_name: string | null
}

export type ShiftStatus = 'active' | 'closed'

export interface Shift {
  id: string
  cashier_id: string
  cashier_name: string
  start_time: string
  end_time: string | null
  total_sales: number
  order_count: number
  status: ShiftStatus
}

export type StaffRole = 'admin' | 'cashier'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  pin_hash: string
  pin_salt: string | null
  pin_algo: 'pbkdf2-sha256' | 'sha256-legacy'
  active: boolean
  must_change_pin: boolean
  created_at: string
}

export interface Settings {
  id: string
  business_name: string
  address: string
  tax_rate: number
  receipt_footer: string
  currency: string
  default_wait_minutes: number
}

export interface CartItem {
  product: Product
  quantity: number
  notes: string | null
}

export interface Table {
  id: string
  label: string
  active: boolean
  created_at: string
}
