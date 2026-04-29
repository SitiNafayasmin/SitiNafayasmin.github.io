import { useMemo, useState } from 'react'
import { useOrderStore } from '../../stores/orderStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { t } from '../../lib/i18n'
import type { OrderStatus, OrderType, PaymentMethod } from '../../lib/types'

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

export function AdminOrders() {
  const orders = useOrderStore((s) => s.orders)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all')

  const filtered = useMemo(() => {
    let result = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter((o) => o.order_type === typeFilter)
    return result
  }, [orders, statusFilter, typeFilter])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.admin.orders.title}</h2>

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">{t.admin.orders.allStatuses}</option>
          {(['awaiting_payment', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map((s) => (
            <option key={s} value={s}>
              {t.order.status[s]}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | OrderType)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">{t.admin.orders.allTypes}</option>
          {(['dine_in', 'takeaway', 'delivery'] as const).map((tp) => (
            <option key={tp} value={tp}>
              {ORDER_TYPE_LABELS[tp]}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-12">{t.admin.orders.none}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">{t.admin.orders.colNo}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colDate}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colType}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colItems}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colSubtotal}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colTax}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colTotal}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colPayment}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colStatus}</th>
                <th className="px-6 py-3 font-medium">{t.admin.orders.colCashier}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono">#{order.order_number}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDateTime(order.created_at)}</td>
                  <td className="px-6 py-3">{ORDER_TYPE_LABELS[order.order_type]}</td>
                  <td className="px-6 py-3">
                    <div className="max-w-[200px]">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs text-gray-600">
                          {item.quantity}× {item.product_name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">{formatCurrency(order.subtotal)}</td>
                  <td className="px-6 py-3 text-gray-500">{formatCurrency(order.tax)}</td>
                  <td className="px-6 py-3 font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-3">
                    {order.payment_method ? PAYMENT_LABELS[order.payment_method] : '-'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>
                      {t.order.status[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{order.cashier_name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function statusColor(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    awaiting_payment: 'bg-orange-100 text-orange-700',
    pending: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}
