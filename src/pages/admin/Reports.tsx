import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useOrderStore } from '../../stores/orderStore'
import { useShiftStore } from '../../stores/shiftStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { t } from '../../lib/i18n'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function AdminReports() {
  const orders = useOrderStore((s) => s.orders)
  const shifts = useShiftStore((s) => s.shifts)
  const [period, setPeriod] = useState<'7' | '30' | 'all'>('7')

  const completedOrders = useMemo(() => {
    const now = new Date()
    return orders
      .filter((o) => o.status === 'completed')
      .filter((o) => {
        if (period === 'all') return true
        const days = parseInt(period)
        const orderDate = new Date(o.created_at)
        const diffMs = now.getTime() - orderDate.getTime()
        return diffMs <= days * 24 * 60 * 60 * 1000
      })
  }, [orders, period])

  const dailySales = useMemo(() => {
    const grouped: Record<string, number> = {}
    completedOrders.forEach((o) => {
      const date = new Date(o.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
      grouped[date] = (grouped[date] ?? 0) + o.total
    })
    return Object.entries(grouped).map(([date, total]) => ({ date, total }))
  }, [completedOrders])

  const orderTypeData = useMemo(() => {
    const grouped: Record<string, number> = {}
    completedOrders.forEach((o) => {
      const label = t.cashier.pos[o.order_type === 'dine_in' ? 'dineIn' : o.order_type === 'takeaway' ? 'takeaway' : 'delivery']
      grouped[label] = (grouped[label] ?? 0) + 1
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [completedOrders])

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

  const closedShifts = shifts.filter((s) => s.status === 'closed')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t.admin.reports.title}</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as '7' | '30' | 'all')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="7">{t.admin.reports.periodLast7}</option>
          <option value="30">{t.admin.reports.periodLast30}</option>
          <option value="all">{t.admin.reports.periodAll}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">{t.admin.reports.totalRevenue}</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">{t.admin.reports.orderCount}</p>
          <p className="text-2xl font-bold text-gray-800">{completedOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">{t.admin.reports.avgOrderValue}</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(avgOrderValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.admin.reports.dailySales}</h3>
          {dailySales.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t.admin.reports.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.admin.reports.orderTypeBreakdown}</h3>
          {orderTypeData.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t.admin.reports.noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={orderTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {orderTypeData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.admin.reports.closedShifts}</h3>
        {closedShifts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t.admin.reports.emptyShifts}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">{t.admin.orders.colCashier}</th>
                <th className="pb-3 font-medium">{t.cashier.shift.startTime}</th>
                <th className="pb-3 font-medium">{t.cashier.shift.endTime}</th>
                <th className="pb-3 font-medium">{t.cashier.shift.orders}</th>
                <th className="pb-3 font-medium">{t.cashier.shift.totalSales}</th>
              </tr>
            </thead>
            <tbody>
              {closedShifts.map((shift) => (
                <tr key={shift.id} className="border-b last:border-0">
                  <td className="py-3">{shift.cashier_name}</td>
                  <td className="py-3 text-gray-500">{formatDateTime(shift.start_time)}</td>
                  <td className="py-3 text-gray-500">{shift.end_time ? formatDateTime(shift.end_time) : '-'}</td>
                  <td className="py-3">{shift.order_count}</td>
                  <td className="py-3 font-medium">{formatCurrency(shift.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
