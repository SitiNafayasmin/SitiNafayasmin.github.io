import { useMemo, useState } from 'react'
import { useOrderStore } from '../../stores/orderStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'

export function AdminOrders() {
  const orders = useOrderStore((s) => s.orders)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter((o) => o.order_type === typeFilter)
    return result
  }, [orders, statusFilter, typeFilter])

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Order History</h2>

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No orders found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Items</th>
                <th className="px-6 py-3 font-medium">Subtotal</th>
                <th className="px-6 py-3 font-medium">Tax</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Cashier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono">#{order.order_number}</td>
                  <td className="px-6 py-3 text-gray-500">{formatDateTime(order.created_at)}</td>
                  <td className="px-6 py-3 capitalize">{order.order_type.replace('_', ' ')}</td>
                  <td className="px-6 py-3">
                    <div className="max-w-[200px]">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs text-gray-600">
                          {item.quantity}x {item.product_name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">{formatCurrency(order.subtotal)}</td>
                  <td className="px-6 py-3 text-gray-500">{formatCurrency(order.tax)}</td>
                  <td className="px-6 py-3 font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-3 capitalize">{order.payment_method ?? '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>
                      {order.status}
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

function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}
