import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Clock, CreditCard, Utensils, XCircle } from 'lucide-react'
import { useOrderStore } from '../../stores/orderStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatCurrency, sanitizeTableId } from '../../lib/utils'
import { Button, Card } from '../../components/ui/primitives'

export function CustomerOrderStatus() {
  const { tableId, orderId } = useParams<{ tableId: string; orderId: string }>()
  const safeTable = sanitizeTableId(tableId)
  const orders = useOrderStore((s) => s.orders)
  const initialize = useOrderStore((s) => s.initialize)
  const refresh = useOrderStore((s) => s.refreshFromStorage)
  const settings = useSettingsStore((s) => s.settings)
  const initSettings = useSettingsStore((s) => s.initialize)

  useEffect(() => {
    initialize()
    initSettings()
  }, [initialize, initSettings])

  // Poll for updates (covers cross-origin cases where BroadcastChannel doesn't fire)
  useEffect(() => {
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  const order = orders.find((o) => o.id === orderId)

  if (!order) {
    return (
      <Shell>
        <Card>
          <p className="text-slate-700">
            Order not found. It may have been removed.
          </p>
          {safeTable && (
            <Link to={`/order/${encodeURIComponent(safeTable)}`}>
              <Button className="mt-4">Back to Menu</Button>
            </Link>
          )}
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-6 text-center">
        <p className="text-sm text-indigo-100/80">{settings.business_name}</p>
        <h1 className="text-2xl font-bold text-white">
          Order #{order.order_number}
        </h1>
        <p className="mt-1 text-sm text-indigo-200">Table {order.table_number}</p>
      </div>

      <StatusCard order={order} currency={settings.currency} />

      <Card className="mt-6">
        <h3 className="mb-3 font-semibold text-slate-900">Items</h3>
        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-slate-700">
              <span>
                {item.quantity}× {item.product_name}
              </span>
              <span>{formatCurrency(item.price * item.quantity, settings.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(order.subtotal, settings.currency)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Tax</dt>
            <dd>{formatCurrency(order.tax, settings.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total, settings.currency)}</dd>
          </div>
        </dl>
      </Card>

      {safeTable && (
        <div className="mt-6 text-center">
          <Link
            to={`/order/${encodeURIComponent(safeTable)}`}
            className="text-sm text-indigo-200 underline underline-offset-4 hover:text-white"
          >
            Order more items
          </Link>
        </div>
      )}
    </Shell>
  )
}

function StatusCard({
  order,
  currency,
}: {
  order: { status: string; pickup_code: string | null; order_number: number; total: number; estimated_wait_minutes: number | null; approved_at: string | null }
  currency: string
}) {
  if (order.status === 'awaiting_payment') {
    return (
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-white">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 p-3 text-amber-700">
            <CreditCard size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-amber-900">
              Please pay at the cashier
            </h2>
            <p className="mt-1 text-sm text-amber-900/80">
              Show this screen or your pickup code to the cashier to confirm your order.
            </p>
            {order.pickup_code && (
              <div className="mt-4 rounded-xl bg-white p-4 text-center ring-1 ring-amber-200">
                <p className="text-xs uppercase tracking-wider text-amber-700">
                  Pickup Code
                </p>
                <p className="mt-1 font-mono text-3xl font-bold text-amber-900">
                  {order.pickup_code}
                </p>
              </div>
            )}
            <p className="mt-3 text-sm text-amber-900/80">
              Amount due:{' '}
              <span className="font-semibold">
                {formatCurrency(order.total, currency)}
              </span>
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (order.status === 'cancelled') {
    return (
      <Card className="border-rose-300 bg-gradient-to-br from-rose-50 to-white">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-rose-100 p-3 text-rose-700">
            <XCircle size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-rose-900">Order cancelled</h2>
            <p className="mt-1 text-sm text-rose-900/80">
              If this was unexpected, please speak to the cashier.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const successCopy =
    order.status === 'ready'
      ? 'Your order is ready! Please head to the counter.'
      : order.status === 'completed'
        ? 'Enjoy your meal!'
        : order.status === 'preparing'
          ? 'The kitchen is preparing your order.'
          : 'Payment confirmed! Your order is on the way.'

  return (
    <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
          {order.status === 'ready' ? <Utensils size={28} /> : <CheckCircle2 size={28} />}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Successful
          </p>
          <h2 className="text-lg font-semibold text-emerald-900">{successCopy}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
              <p className="text-xs text-emerald-700">Order #</p>
              <p className="text-2xl font-bold text-emerald-900">#{order.order_number}</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-200">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <Clock size={12} /> Est. wait
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                {order.estimated_wait_minutes ?? 15}
                <span className="text-sm font-medium text-emerald-700"> min</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
    </div>
  )
}
