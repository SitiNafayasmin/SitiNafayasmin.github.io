import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useOrderStore } from '../../stores/orderStore'
import { useShiftStore } from '../../stores/shiftStore'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { Order, PaymentMethod } from '../../lib/types'
import { formatCurrency, formatTime } from '../../lib/utils'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui/primitives'
import { t } from '../../lib/i18n'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'ewallet']

export function PendingPayments() {
  const { orders, approveCustomerOrder, cancelOrder, initialize } = useOrderStore()
  const { activeShift, updateShiftSales } = useShiftStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const settings = useSettingsStore((s) => s.settings)

  useEffect(() => {
    initialize()
  }, [initialize])

  const pending = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'awaiting_payment')
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [orders],
  )

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <PageHeader
        title={t.cashier.pending.title}
        description={t.cashier.pending.subtitle}
      />
      {!activeShift && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{t.cashier.pending.noClock}</p>
        </Card>
      )}
      {pending.length === 0 ? (
        <EmptyState
          title={t.cashier.pending.empty}
          description={t.cashier.pending.emptyDesc}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pending.map((order) => (
            <PendingOrderCard
              key={order.id}
              order={order}
              currency={settings.currency}
              defaultWaitMinutes={settings.default_wait_minutes}
              onApprove={(paymentMethod, waitMinutes) => {
                const approved = approveCustomerOrder({
                  orderId: order.id,
                  paymentMethod,
                  cashierId: currentUser?.id ?? null,
                  cashierName: currentUser?.name ?? null,
                  shiftId: activeShift?.id ?? null,
                  waitMinutes,
                })
                if (approved && activeShift) updateShiftSales(approved.total)
              }}
              onCancel={() => {
                if (window.confirm(t.cashier.pending.cancelConfirm)) {
                  cancelOrder(order.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PendingOrderCard({
  order,
  currency,
  defaultWaitMinutes,
  onApprove,
  onCancel,
}: {
  order: Order
  currency: string
  defaultWaitMinutes: number
  onApprove: (paymentMethod: PaymentMethod, waitMinutes: number) => void
  onCancel: () => void
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [waitMinutes, setWaitMinutes] = useState(defaultWaitMinutes)

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <Badge tone="amber">{t.cashier.pending.awaitingPayment}</Badge>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            {t.cashier.pending.orderNumber} #{order.order_number}
          </h3>
          <p className="text-sm text-slate-500">
            {t.admin.tables.tableLabel} {order.table_number} · {formatTime(order.created_at)}
          </p>
          {order.customer_name && (
            <p className="text-sm text-slate-600">{t.cashier.pending.customerName}: {order.customer_name}</p>
          )}
        </div>
        <div className="rounded-lg bg-amber-100 px-3 py-2 text-center font-mono text-sm font-bold text-amber-900">
          {order.pickup_code ?? '—'}
        </div>
      </div>

      <ul className="my-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between text-slate-700">
            <span>
              {item.quantity}× {item.product_name}
            </span>
            <span>{formatCurrency(item.price * item.quantity, currency)}</span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="mb-3 rounded bg-yellow-50 p-2 text-xs italic text-yellow-800">
          {t.kitchen.noteLabel}: {order.notes}
        </p>
      )}
      <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-sm text-slate-500">{t.cashier.pending.amountDue}</span>
        <span className="text-lg font-bold text-slate-900">
          {formatCurrency(order.total, currency)}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">{t.cashier.pos.paymentMethod}</p>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  paymentMethod === method
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {method === 'cash' ? t.cashier.pos.cash : method === 'card' ? t.cashier.pos.card : t.cashier.pos.ewallet}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
            <Clock size={12} /> {t.cashier.pending.waitTimeLabel}
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={waitMinutes}
            onChange={(e) => setWaitMinutes(parseInt(e.target.value) || defaultWaitMinutes)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="success"
            className="flex-1"
            onClick={() => onApprove(paymentMethod, waitMinutes)}
          >
            <CheckCircle2 size={16} /> {t.cashier.pending.acceptAndPay}
          </Button>
          <Button variant="ghost" onClick={onCancel} title={t.common.cancel}>
            <XCircle size={16} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
