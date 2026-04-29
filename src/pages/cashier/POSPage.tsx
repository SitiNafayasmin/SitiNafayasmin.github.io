import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Pause,
  Play,
  X,
} from 'lucide-react'
import { useProductStore } from '../../stores/productStore'
import { useOrderStore } from '../../stores/orderStore'
import { useShiftStore } from '../../stores/shiftStore'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { OrderType, PaymentMethod, Product } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { sanitizeDiscount } from '../../lib/security'
import { t } from '../../lib/i18n'

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: t.cashier.pos.dineIn,
  takeaway: t.cashier.pos.takeaway,
  delivery: t.cashier.pos.delivery,
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: t.cashier.pos.cash,
  card: t.cashier.pos.card,
  ewallet: t.cashier.pos.ewallet,
}

export function POSPage() {
  const { products, categories } = useProductStore()
  const {
    cart,
    heldOrders,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    holdOrder,
    recallOrder,
    deleteHeldOrder,
    placeOrder,
  } = useOrderStore()
  const { activeShift, updateShiftSales } = useShiftStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const settings = useSettingsStore((s) => s.settings)

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [showCheckout, setShowCheckout] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [showHeld, setShowHeld] = useState(false)

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.available)
    if (activeCategoryId) {
      result = result.filter((p) => p.category_id === activeCategoryId)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku?.toLowerCase().includes(q) ?? false),
      )
    }
    return result
  }, [products, activeCategoryId, searchQuery])

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const tax = subtotal * (settings.tax_rate / 100)
  const safeDiscount = sanitizeDiscount(discount, subtotal)
  const total = subtotal + tax - safeDiscount

  const handleAddProduct = (product: Product) => {
    const inCart = cart.find((c) => c.product.id === product.id)?.quantity ?? 0
    if (product.stock !== null && product.stock !== undefined && inCart >= product.stock) return
    addToCart({ product, quantity: 1, notes: null })
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !activeShift) return
    const order = await placeOrder({
      orderType,
      paymentMethod,
      cashierId: currentUser?.id ?? null,
      cashierUserId: currentUser?.user_id ?? null,
      cashierName: currentUser?.name ?? null,
      shiftId: activeShift.id,
      tableNumber: orderType === 'dine_in' ? tableNumber || null : null,
      notes: orderNotes || null,
      taxRate: settings.tax_rate,
      discount: safeDiscount,
    })
    if (!order) return
    updateShiftSales(order.total)
    setShowCheckout(false)
    setDiscount(0)
    setTableNumber('')
    setOrderNotes('')
  }

  if (!activeShift) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">{t.cashier.shift.needClockIn}</p>
          <Link to="/cashier/shift" className="text-blue-600 hover:text-blue-700 font-medium">
            {t.cashier.shift.goToShift}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Category Tabs */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t.cashier.pos.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {heldOrders.length > 0 && (
              <button
                onClick={() => setShowHeld(!showHeld)}
                className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Pause size={16} /> {t.cashier.pos.held} ({heldOrders.length})
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCategoryId(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                !activeCategoryId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.common.all}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeCategoryId === cat.id ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeCategoryId === cat.id ? { backgroundColor: cat.color } : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Held Orders Dropdown */}
        {showHeld && heldOrders.length > 0 && (
          <div className="bg-orange-50 border-b p-4 space-y-2">
            {heldOrders.map((held) => (
              <div key={held.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <span className="font-medium text-sm">{held.label}</span>
                  <span className="text-xs text-gray-500 ml-2">({held.cart.length} {t.common.items})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { recallOrder(held.id); setShowHeld(false) }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Play size={14} /> {t.cashier.pos.recallShort}
                  </button>
                  <button
                    onClick={() => deleteHeldOrder(held.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                    aria-label={t.common.delete}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-12">{t.cashier.pos.noProductsFound}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id)?.quantity ?? 0
                const stockKnown = product.stock !== null && product.stock !== undefined
                const remaining = stockKnown ? (product.stock as number) - inCart : null
                const soldOut = remaining !== null && remaining <= 0
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    disabled={soldOut}
                    className="relative bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow border border-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <h3 className="font-medium text-gray-800 text-sm mb-1 truncate">{product.name}</h3>
                    <p className="text-blue-600 font-bold">{formatCurrency(product.price)}</p>
                    {soldOut && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        {t.admin.products.soldOut}
                      </span>
                    )}
                    {stockKnown && !soldOut && (product.stock as number) <= 5 && (
                      <span className="mt-1 ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        {product.stock}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">{t.cashier.pos.currentOrder}</h3>
          </div>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const label = `${t.cashier.pos.hold} ${new Date().toLocaleTimeString()}`
                    holdOrder(label)
                  }}
                  className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium"
                >
                  {t.cashier.pos.hold}
                </button>
                <button
                  onClick={clearCart}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium"
                >
                  {t.cashier.pos.clear}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Order Type Selector */}
        <div className="p-4 border-b flex gap-2">
          {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                orderType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {ORDER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {orderType === 'dine_in' && (
          <div className="px-4 pt-3">
            <input
              placeholder={t.cashier.pos.tableNumber}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">{t.cashier.pos.cartEmpty}</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    disabled={
                      item.product.stock !== null &&
                      item.product.stock !== undefined &&
                      item.quantity >= item.product.stock
                    }
                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 text-red-600"
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout */}
        <div className="border-t p-4">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t.common.subtotal}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t.common.tax} ({settings.tax_rate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            {safeDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t.common.discount}</span>
                <span>-{formatCurrency(safeDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t">
              <span>{t.common.total}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {t.cashier.pos.checkout}
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.cashier.pos.paymentMethod}</label>
                <div className="flex gap-2">
                  {(['cash', 'card', 'ewallet'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                        paymentMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {PAYMENT_LABELS[method]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.cashier.pos.discountAmount}</label>
                <input
                  type="number"
                  step="1"
                  min={0}
                  max={subtotal}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.cashier.pos.orderNotes}</label>
                <input
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t.cashier.pos.orderNotesPlaceholder}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { void handlePlaceOrder() }}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  {t.cashier.pos.placeOrder}
                </button>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.cashier.pos.back}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
