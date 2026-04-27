import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useProductStore } from './stores/productStore'
import { useOrderStore } from './stores/orderStore'
import { useShiftStore } from './stores/shiftStore'
import { useSettingsStore } from './stores/settingsStore'
import { useTableStore } from './stores/tableStore'

import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { AdminLayout } from './components/layout/AdminLayout'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminProducts } from './pages/admin/Products'
import { AdminOrders } from './pages/admin/Orders'
import { AdminReports } from './pages/admin/Reports'
import { AdminStaff } from './pages/admin/Staff'
import { AdminSettings } from './pages/admin/SettingsPage'
import { AdminTables } from './pages/admin/Tables'
import { CashierLayout } from './components/layout/CashierLayout'
import { ShiftPage } from './pages/cashier/ShiftPage'
import { POSPage } from './pages/cashier/POSPage'
import { PendingPayments } from './pages/cashier/PendingPayments'
import { KitchenDisplay } from './pages/kitchen/KitchenDisplay'
import { CustomerMenu } from './pages/customer/CustomerMenu'
import { CustomerOrderStatus } from './pages/customer/OrderStatus'
import { ChangePinModal } from './components/ChangePinModal'

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: string
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/" replace />
  if (requiredRole && currentUser.role !== requiredRole) return <Navigate to="/" replace />

  if (currentUser.must_change_pin) {
    // Block access behind a modal until the user sets a new PIN. The modal is
    // self-managed (calls changePin which flips must_change_pin off).
    return (
      <>
        {children}
        <ChangePinModal onComplete={() => { /* store update re-renders this */ }} />
      </>
    )
  }

  return <>{children}</>
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initialize)
  const initProducts = useProductStore((s) => s.initialize)
  const initOrders = useOrderStore((s) => s.initialize)
  const initShifts = useShiftStore((s) => s.initialize)
  const initSettings = useSettingsStore((s) => s.initialize)
  const initTables = useTableStore((s) => s.initialize)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    initAuth()
    initProducts()
    initOrders()
    initShifts()
    initSettings()
    initTables()
  }, [initAuth, initProducts, initOrders, initShifts, initSettings, initTables])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-xl text-slate-200">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="tables" element={<AdminTables />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route
          path="/cashier"
          element={
            <ProtectedRoute>
              <CashierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<POSPage />} />
          <Route path="shift" element={<ShiftPage />} />
          <Route path="payments" element={<PendingPayments />} />
        </Route>

        <Route path="/kitchen" element={<KitchenDisplay />} />

        <Route path="/order/:tableId" element={<CustomerMenu />} />
        <Route
          path="/order/:tableId/status/:orderId"
          element={<CustomerOrderStatus />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
