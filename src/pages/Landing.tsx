import { useNavigate } from 'react-router-dom'
import { Monitor, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react'

const ROLES = [
  {
    label: 'Admin',
    description: 'Manage menu, staff, tables & reports.',
    icon: ShieldCheck,
    path: '/login?role=admin',
    accent: 'from-indigo-500 to-violet-600',
  },
  {
    label: 'Cashier',
    description: 'Take orders, confirm payments, manage shifts.',
    icon: Monitor,
    path: '/login?role=cashier',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    label: 'Kitchen',
    description: 'Live queue of paid orders to prepare.',
    icon: UtensilsCrossed,
    path: '/kitchen',
    accent: 'from-orange-500 to-rose-600',
  },
]

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Decorative gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-600/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-white/10">
            <Sparkles size={12} /> Modern POS
          </span>
          <h1 className="mt-4 bg-gradient-to-br from-white via-indigo-100 to-indigo-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            Xevora POS
          </h1>
          <p className="mt-3 text-lg text-slate-400">
            A secure, QR-enabled Point of Sale for modern restaurants.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {ROLES.map(({ label, description, icon: Icon, path, accent }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 text-left ring-1 ring-inset ring-white/10 backdrop-blur transition hover:ring-white/25"
            >
              <div
                className={`pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-br ${accent}`}
                aria-hidden
              />
              <div className="relative">
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">{label}</h2>
                <p className="mt-1 text-sm text-slate-300 group-hover:text-white/90">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-slate-500">
          First-time admins: default PIN is <span className="font-mono text-slate-300">1234</span>
          {' '}— you&apos;ll be asked to change it on login.
        </p>
      </div>
    </div>
  )
}
