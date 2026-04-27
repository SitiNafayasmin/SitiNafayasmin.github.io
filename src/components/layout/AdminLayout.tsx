import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Settings,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useSettingsStore } from '../../stores/settingsStore'

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products', end: false },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders', end: false },
  { to: '/admin/tables', icon: QrCode, label: 'Tables & QR', end: false },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports', end: false },
  { to: '/admin/staff', icon: Users, label: 'Staff', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
]

export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.currentUser)
  const businessName = useSettingsStore((s) => s.settings.business_name)

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-6">
          <h1 className="text-lg font-bold text-slate-900">{businessName}</h1>
          <p className="text-xs uppercase tracking-wider text-slate-500">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          {user && (
            <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <p className="font-medium text-slate-700">{user.name}</p>
              <p className="capitalize text-slate-500">{user.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
