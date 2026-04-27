import { NavLink, Outlet } from 'react-router-dom'
import { Clock, LogOut, Receipt, ShoppingBag, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useShiftStore } from '../../stores/shiftStore'
import { useOrderStore } from '../../stores/orderStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function CashierLayout() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const activeShift = useShiftStore((s) => s.activeShift)
  const pendingPaymentCount = useOrderStore(
    (s) => s.orders.filter((o) => o.status === 'awaiting_payment').length,
  )
  const businessName = useSettingsStore((s) => s.settings.business_name)

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-base font-bold text-slate-900">{businessName}</h1>
          <nav className="flex items-center gap-1">
            <CashierNav to="/cashier" end icon={<ShoppingBag size={16} />} label="POS" />
            <CashierNav
              to="/cashier/payments"
              icon={<Receipt size={16} />}
              label="Pending Payments"
              badge={pendingPaymentCount}
            />
            <CashierNav to="/cashier/shift" icon={<Clock size={16} />} label="Shift" />
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {activeShift && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Shift Active
            </span>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={16} />
            {currentUser?.name}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-rose-600 transition hover:text-rose-700"
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

function CashierNav({
  to,
  end,
  icon,
  label,
  badge,
}: {
  to: string
  end?: boolean
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
