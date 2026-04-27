import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Monitor, UtensilsCrossed } from 'lucide-react'

const ROLES = [
  {
    label: 'Admin',
    description: 'Manage products, staff, reports & settings',
    icon: ShieldCheck,
    path: '/login?role=admin',
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    label: 'Cashier',
    description: 'Process orders, manage shifts & payments',
    icon: Monitor,
    path: '/login?role=cashier',
    color: 'bg-green-600 hover:bg-green-700',
  },
  {
    label: 'Kitchen',
    description: 'View and manage active cooking orders',
    icon: UtensilsCrossed,
    path: '/kitchen',
    color: 'bg-orange-600 hover:bg-orange-700',
  },
]

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-bold text-white mb-2">Xevora POS</h1>
        <p className="text-gray-400 text-lg mb-12">Point of Sale System</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLES.map(({ label, description, icon: Icon, path, color }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`${color} text-white rounded-2xl p-8 flex flex-col items-center gap-4 transition-all transform hover:scale-105 shadow-lg`}
            >
              <Icon size={48} strokeWidth={1.5} />
              <h2 className="text-2xl font-bold">{label}</h2>
              <p className="text-sm opacity-80">{description}</p>
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-sm mt-12">
          Default Admin PIN: 1234
        </p>
      </div>
    </div>
  )
}
