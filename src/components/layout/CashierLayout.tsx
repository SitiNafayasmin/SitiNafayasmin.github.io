import { Outlet } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useShiftStore } from '../../stores/shiftStore'

export function CashierLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const activeShift = useShiftStore((s) => s.activeShift)

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">Xevora POS</h1>
          {activeShift && (
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
              Shift Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} />
            {currentUser?.name}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
