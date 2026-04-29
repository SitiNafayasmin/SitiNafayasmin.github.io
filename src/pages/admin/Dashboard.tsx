import { useMemo } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { useOrderStore } from '../../stores/orderStore'
import { useShiftStore } from '../../stores/shiftStore'
import { useAuthStore } from '../../stores/authStore'
import { formatCurrency } from '../../lib/utils'
import { t } from '../../lib/i18n'
import { OrderStatusBadge } from '../../components/ui/primitives'

export function AdminDashboard() {
  const orders = useOrderStore((s) => s.orders)
  const shifts = useShiftStore((s) => s.shifts)
  const staffList = useAuthStore((s) => s.staffList)

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayOrders = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today && o.status !== 'cancelled',
    )
    const totalRevenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0)
    const todayRevenue = todayOrders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0)

    return {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      totalRevenue,
      todayRevenue,
      activeStaff: staffList.filter((s) => s.active).length,
      totalShifts: shifts.length,
    }
  }, [orders, shifts, staffList])

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
    [orders],
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.admin.dashboard.title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<DollarSign size={24} />}
          label={t.admin.dashboard.todaySales}
          value={formatCurrency(stats.todayRevenue)}
          color="bg-green-500"
        />
        <StatCard
          icon={<ShoppingCart size={24} />}
          label={t.admin.dashboard.todayOrders}
          value={String(stats.todayOrders)}
          color="bg-blue-500"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label={t.admin.dashboard.totalRevenue}
          value={formatCurrency(stats.totalRevenue)}
          color="bg-purple-500"
        />
        <StatCard
          icon={<Users size={24} />}
          label={t.admin.dashboard.activeStaff}
          value={String(stats.activeStaff)}
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.admin.dashboard.recentOrders}</h3>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t.admin.dashboard.noRecentOrders}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">{t.admin.orders.cashier /* reuse */}</th>
                  <th className="pb-3 font-medium">{t.common.items}</th>
                  <th className="pb-3 font-medium">{t.common.total}</th>
                  <th className="pb-3 font-medium">{t.common.status}</th>
                  <th className="pb-3 font-medium">{t.admin.orders.cashier}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 font-mono">#{order.order_number}</td>
                    <td className="py-3 capitalize">{order.order_type.replace('_', ' ')}</td>
                    <td className="py-3">{order.items.length} {t.common.item}</td>
                    <td className="py-3 font-medium">{formatCurrency(order.total)}</td>
                    <td className="py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-gray-500">{order.cashier_name ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`${color} text-white p-3 rounded-lg`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}


