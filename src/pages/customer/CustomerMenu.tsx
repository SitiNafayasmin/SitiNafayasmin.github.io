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
import { t } from '../../lib/i18n'

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

  const tableKnown = tables.some((table) => table.label === safeTable && table.active)

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

  const handleSubmit = async () => {
    if (!safeTable || items.length === 0 || submitting) return
    setSubmitting(true)
    const order = await placeCustomerOrder({
      tableNumber: safeTable,
      items: items.map((i) => ({ product: i.product, quantity: i.quantity, notes: i.notes })),
      notes: notes.trim() || null,
      customerName: customerName.trim() || null,
      taxRate: settings.tax_rate,
    })
    setSubmitting(false)
    if (!order) {
      alert(t.customer.submitFailed)
      return
    }
    navigate(`/order/${encodeURIComponent(safeTable)}/status/${order.id}`)
  }

  if (!safeTable) {
    return (
      <CustomerShell>
        <Card>
          <p className="text-slate-700">{t.customer.invalidTable}</p>
        </Card>
      </CustomerShell>
    )
  }

  return (
    <CustomerShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-indigo-100/80">{settings.business_name}</p>
          <h1 className="text-2xl font-bold text-white">{t.admin.tables.tableLabel} {safeTable}</h1>
          {!tableKnown && (
            <p className="mt-1 text-xs text-amber-300">
              {t.customer.tableNotRegistered}
            </p>
          )}
        </div>
        <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
          <Utensils size={16} className="mr-1.5 inline" />
          {t.customer.dineIn}
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
            {t.common.all}
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
            {t.customer.empty}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const line = items.find((i) => i.product.id === product.id)
              const remaining =
                product.stock === null || product.stock === undefined
                  ? null
                  : product.stock - (line?.quantity ?? 0)
              const soldOut = remaining !== null && remaining <= 0
              return (
                <li
                  key={product.id}
                  className={`flex items-center gap-4 p-4 ${soldOut && !line ? 'opacity-60' : ''}`}
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-sm text-indigo-600 font-semibold">
                      {formatCurrency(product.price, settings.currency)}
                    </p>
                    {soldOut && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t.admin.products.soldOut}
                      </span>
                    )}
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
                        disabled={soldOut}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        aria-label="Increase"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <Button onClick={() => changeQty(product, 1)} size="sm" disabled={soldOut}>
                      <Plus size={14} /> {t.customer.add}
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
          <h3 className="mb-3 font-semibold text-slate-900">{t.customer.yourOrder}</h3>
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
              <dt>{t.common.subtotal}</dt>
              <dd>{formatCurrency(totals.subtotal, settings.currency)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>{t.common.tax} ({settings.tax_rate}%)</dt>
              <dd>{formatCurrency(totals.tax, settings.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <dt>{t.common.total}</dt>
              <dd>{formatCurrency(totals.total, settings.currency)}</dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-3">
            <Input
              placeholder={t.customer.namePlaceholder}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={64}
            />
            <Input
              placeholder={t.customer.notesPlaceholder}
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
            {t.customer.placeOrder} ({t.customer.itemsCount(itemCount)}) ·{' '}
            {formatCurrency(totals.total, settings.currency)}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            {t.customer.paymentHint}
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
