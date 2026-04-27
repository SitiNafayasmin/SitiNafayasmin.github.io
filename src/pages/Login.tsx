import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Lock } from 'lucide-react'

export function Login() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') ?? 'cashier'
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    setLoading(true)
    setError('')
    const user = await login(pin)
    setLoading(false)

    if (!user) {
      setError('Invalid PIN')
      setPin('')
      return
    }

    if (role === 'admin' && user.role !== 'admin') {
      setError('Access denied. Admin PIN required.')
      setPin('')
      return
    }

    navigate(role === 'admin' ? '/admin' : '/cashier')
  }

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      setPin((p) => p + digit)
    }
  }

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {role === 'admin' ? 'Admin' : 'Cashier'} Login
          </h2>
          <p className="text-gray-500 text-sm mt-1">Enter your PIN to continue</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < pin.length ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-semibold text-gray-800 transition-colors"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
            className="h-14 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium transition-colors"
          >
            {loading ? '...' : 'Enter'}
          </button>
        </div>
      </div>
    </div>
  )
}
