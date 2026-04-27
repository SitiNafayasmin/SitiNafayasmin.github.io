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
    addToCart({ product, quantity: 1, notes: null })
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0 || !activeShift) return
    const order = placeOrder({
      orderType,
      paymentMethod,
      cashierId: currentUser?.id ?? null,
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
          <p className="text-gray-500 text-lg mb-4">You need to clock in to start a shift.</p>
          <Link to="/cashier/shift" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Shift Management
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
                placeholder="Search products..."
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
                <Pause size={16} /> Held ({heldOrders.length})
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
              All
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
                  <span className="text-xs text-gray-500 ml-2">({held.cart.length} items)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { recallOrder(held.id); setShowHeld(false) }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Play size={14} /> Recall
                  </button>
                  <button
                    onClick={() => deleteHeldOrder(held.id)}
                    className="text-xs text-red-600 hover:text-red-700"
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
            <p className="text-gray-400 text-center py-12">No products found</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <h3 className="font-medium text-gray-800 text-sm mb-1 truncate">{product.name}</h3>
                  <p className="text-blue-600 font-bold">{formatCurrency(product.price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-800">Current Order</h3>
          </div>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <>
                <button
                  onClick={() => {
                    const label = `Order ${new Date().toLocaleTimeString()}`
                    holdOrder(label)
                  }}
                  className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium"
                >
                  Hold
                </button>
                <button
                  onClick={clearCart}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium"
                >
                  Clear
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
              {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>

        {orderType === 'dine_in' && (
          <div className="px-4 pt-3">
            <input
              placeholder="Table number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No items in cart</p>
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
                    className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 text-red-600"
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
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax ({settings.tax_rate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            {safeDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(safeDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Checkout
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {(['cash', 'card', 'ewallet'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                        paymentMethod === method ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {method === 'ewallet' ? 'E-Wallet' : method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount (amount)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={subtotal}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Order Notes</label>
                <input
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePlaceOrder}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  Place Order
                </button>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
