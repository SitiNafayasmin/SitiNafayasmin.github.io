import { useNavigate } from 'react-router-dom'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useShiftStore } from '../../stores/shiftStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'

export function ShiftPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const { activeShift, clockIn, clockOut, shifts } = useShiftStore()

  const handleClockIn = () => {
    if (!currentUser) return
    clockIn(currentUser.id, currentUser.name)
    navigate('/cashier')
  }

  const handleClockOut = () => {
    const closed = clockOut()
    if (closed) {
      // Stay on shift page to show summary
    }
  }

  const recentShifts = shifts
    .filter((s) => s.cashier_id === currentUser?.id && s.status === 'closed')
    .sort((a, b) => (b.end_time ?? '').localeCompare(a.end_time ?? ''))
    .slice(0, 5)

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="max-w-lg w-full">
        {!activeShift ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={36} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Start Your Shift</h2>
            <p className="text-gray-500 mb-8">
              Clock in to begin processing orders, {currentUser?.name}.
            </p>
            <button
              onClick={handleClockIn}
              className="flex items-center justify-center gap-3 w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors"
            >
              <LogIn size={24} />
              Clock In
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={36} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Shift Active</h2>
            <p className="text-gray-500 mb-6">
              Started: {formatDateTime(activeShift.start_time)}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Orders</p>
                <p className="text-2xl font-bold">{activeShift.order_count}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(activeShift.total_sales)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/cashier')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to POS
              </button>
              <button
                onClick={handleClockOut}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                <LogOut size={20} />
                Clock Out
              </button>
            </div>
          </div>
        )}

        {recentShifts.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Shifts</h3>
            <div className="space-y-3">
              {recentShifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="text-sm text-gray-500">
                    {shift.end_time ? formatDateTime(shift.end_time) : '-'}
                  </div>
                  <div className="text-sm">
                    {shift.order_count} orders &middot; {formatCurrency(shift.total_sales)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
