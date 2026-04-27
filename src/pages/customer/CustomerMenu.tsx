import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Utensils } from 'lucide-react'
import { useProductStore } from '../../stores/productStore'
import { useOrderStore } from '../../stores/orderStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTableStore } from '../../stores/tableStore'
import type { Product } from '../../lib/types'
import { formatCurrency, sanitizeTableId } from '../../lib/utils'
import { Button, Card, Input } from '../../components/ui/primitives'

interface LineItem {
  product: Product
  quantity: number
  notes: string | null
}

export function CustomerMenu() {
  const { tableId } = useParams<{ tableId: string }>()
  const safeTable = sanitizeTableId(tableId)
  const navigate = useNavigate()

  const { products, categories, initialize: initProducts } = useProductStore()
  const { placeCustomerOrder } = useOrderStore()
  const { tables, initialize: initTables } = useTableStore()
  const { settings, initialize: initSettings } = useSettingsStore()

  useEffect(() => {
    initProducts()
    initTables()
    initSettings()
  }, [initProducts, initTables, initSettings])

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tableKnown = tables.some((t) => t.label === safeTable && t.active)

  const filteredProducts = useMemo(() => {
    const available = products.filter((p) => p.available)
    if (!activeCategoryId) return available
    return available.filter((p) => p.category_id === activeCategoryId)
  }, [products, activeCategoryId])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    const tax = subtotal * (settings.tax_rate / 100)
    return { subtotal, tax, total: subtotal + tax }
  }, [items, settings.tax_rate])

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const changeQty = (product: Product, delta: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (!existing && delta > 0) {
        return [...prev, { product, quantity: 1, notes: null }]
      }
      if (!existing) return prev
      const nextQty = existing.quantity + delta
      if (nextQty <= 0) return prev.filter((i) => i.product.id !== product.id)
      return prev.map((i) =>
        i.product.id === product.id ? { ...i, quantity: nextQty } : i,
      )
    })
  }

  const handleSubmit = () => {
    if (!safeTable || items.length === 0 || submitting) return
    setSubmitting(true)
    const order = placeCustomerOrder({
      tableNumber: safeTable,
      items: items.map((i) => ({ product: i.product, quantity: i.quantity, notes: i.notes })),
      notes: notes.trim() || null,
      customerName: customerName.trim() || null,
      taxRate: settings.tax_rate,
    })
    setSubmitting(false)
    if (!order) {
      alert('Could not submit order. Please try again.')
      return
    }
    navigate(`/order/${encodeURIComponent(safeTable)}/status/${order.id}`)
  }

  if (!safeTable) {
    return (
      <CustomerShell>
        <Card>
          <p className="text-slate-700">Invalid table code. Please scan the QR again.</p>
        </Card>
      </CustomerShell>
    )
  }

  return (
    <CustomerShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-indigo-100/80">{settings.business_name}</p>
          <h1 className="text-2xl font-bold text-white">Table {safeTable}</h1>
          {!tableKnown && (
            <p className="mt-1 text-xs text-amber-300">
              Table not yet registered — please notify staff.
            </p>
          )}
        </div>
        <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
          <Utensils size={16} className="mr-1.5 inline" />
          Dine-in
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !activeCategoryId
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={activeCategoryId === cat.id ? { backgroundColor: cat.color } : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeCategoryId === cat.id
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No items available right now.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const line = items.find((i) => i.product.id === product.id)
              return (
                <li
                  key={product.id}
                  className="flex items-center gap-4 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-sm text-indigo-600 font-semibold">
                      {formatCurrency(product.price, settings.currency)}
                    </p>
                  </div>
                  {line ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(product, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                        aria-label="Decrease"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-medium">{line.quantity}</span>
                      <button
                        onClick={() => changeQty(product, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                        aria-label="Increase"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <Button onClick={() => changeQty(product, 1)} size="sm">
                      <Plus size={14} /> Add
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {items.length > 0 && (
        <Card className="mt-6">
          <h3 className="mb-3 font-semibold text-slate-900">Your Order</h3>
          <ul className="mb-4 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.product.id} className="flex justify-between text-slate-700">
                <span>
                  {i.quantity}× {i.product.name}
                </span>
                <span>{formatCurrency(i.product.price * i.quantity, settings.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(totals.subtotal, settings.currency)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Tax ({settings.tax_rate}%)</dt>
              <dd>{formatCurrency(totals.tax, settings.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <dt>Total</dt>
              <dd>{formatCurrency(totals.total, settings.currency)}</dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-3">
            <Input
              placeholder="Your name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={64}
            />
            <Input
              placeholder="Special requests (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
          </div>

          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <ShoppingBag size={18} />
            Place Order ({itemCount} {itemCount === 1 ? 'item' : 'items'}) ·{' '}
            {formatCurrency(totals.total, settings.currency)}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            You&apos;ll pay at the cashier. This does not charge your phone.
          </p>
        </Card>
      )}
    </CustomerShell>
  )
}

function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-32">{children}</div>
    </div>
  )
}
