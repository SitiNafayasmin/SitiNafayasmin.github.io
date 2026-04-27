import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products', end: false },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders', end: false },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports', end: false },
  { to: '/admin/staff', icon: Users, label: 'Staff', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
]

export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">Xevora POS</h1>
          <p className="text-sm text-gray-500">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut size={20} />
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
