import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Maximize,
  Volume2,
  VolumeX,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrderStore } from '../../stores/orderStore'
import type { Order, OrderStatus } from '../../lib/types'
import { formatTime } from '../../lib/utils'
import { t } from '../../lib/i18n'

const OVERDUE_MINUTES = 10

export function KitchenDisplay() {
  const navigate = useNavigate()
  const { orders, updateOrderStatus, initialize } = useOrderStore()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const prevOrderCountRef = useRef(orders.length)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Listen for cross-tab updates
  useEffect(() => {
    const channel = new BroadcastChannel('xevora_pos')
    channel.onmessage = () => {
      initialize()
    }
    return () => channel.close()
  }, [initialize])

  // Play sound on new order
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === 'pending').length
    if (pendingCount > prevOrderCountRef.current && soundEnabled) {
      playNotificationSound()
    }
    prevOrderCountRef.current = pendingCount
  }, [orders, soundEnabled])

  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'pending' || o.status === 'preparing')
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [orders],
  )

  const completedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'ready' || o.status === 'completed')
        .sort((a, b) => b.completed_at?.localeCompare(a.completed_at ?? '') ?? 0)
        .slice(0, 20),
    [orders],
  )

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      void updateOrderStatus(orderId, newStatus)
    },
    [updateOrderStatus],
  )

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ChefHat size={24} className="text-orange-400" />
            <h1 className="text-xl font-bold">{t.kitchen.title}</h1>
          </div>
          <span className="bg-orange-600 text-white text-sm font-medium px-3 py-1 rounded-full">
            {activeOrders.length} {t.common.active}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              showCompleted ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {showCompleted ? t.common.hide : t.common.show} {t.common.completed}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            <Maximize size={20} />
          </button>
        </div>
      </header>

      {/* Order Grid */}
      <div className="p-6">
        {activeOrders.length === 0 && !showCompleted ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <ChefHat size={64} className="text-gray-600 mx-auto mb-4" />
              <p className="text-2xl text-gray-500">{t.kitchen.empty}</p>
              <p className="text-gray-600 mt-2">{t.kitchen.subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        {showCompleted && completedOrders.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-400 mt-8 mb-4">
              {t.order.status.completed}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-60">
              {completedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const minutesElapsed = Math.floor(
    (now - new Date(order.created_at).getTime()) / 60000,
  )
  const isOverdue = minutesElapsed >= OVERDUE_MINUTES && order.status !== 'ready' && order.status !== 'completed'

  const borderColor = (() => {
    if (order.status === 'ready' || order.status === 'completed') return 'border-green-500'
    if (isOverdue) return 'border-red-500'
    if (order.status === 'preparing') return 'border-yellow-500'
    return 'border-blue-500'
  })()

  const bgColor = (() => {
    if (order.status === 'ready' || order.status === 'completed') return 'bg-green-900/30'
    if (isOverdue) return 'bg-red-900/30'
    if (order.status === 'preparing') return 'bg-yellow-900/20'
    return 'bg-gray-800'
  })()

  return (
    <div className={`${bgColor} rounded-xl border-2 ${borderColor} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-2xl font-bold">#{order.order_number}</span>
          <span className="ml-2 text-sm text-gray-400 capitalize">
            {order.order_type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Clock size={14} />
          {minutesElapsed}m
        </div>
      </div>

      {order.table_number && (
        <p className="text-sm text-yellow-400 mb-2">{t.kitchen.table}: {order.table_number}</p>
      )}

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div>
              <span className="font-bold text-white mr-2">{item.quantity}x</span>
              <span>{item.product_name}</span>
            </div>
          </div>
        ))}
        {order.items.some((item) => item.notes) && (
          <div className="mt-2 space-y-1">
            {order.items
              .filter((item) => item.notes)
              .map((item) => (
                <p key={item.id} className="text-xs text-yellow-300 italic">
                  {item.product_name}: {item.notes}
                </p>
              ))}
          </div>
        )}
      </div>

      {order.notes && (
        <p className="text-xs text-yellow-300 italic mb-3">{t.kitchen.noteLabel}: {order.notes}</p>
      )}

      <p className="text-xs text-gray-500 mb-3">{formatTime(order.created_at)}</p>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={() => onStatusChange(order.id, 'preparing')}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <ChefHat size={16} /> {t.kitchen.markPreparing}
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => onStatusChange(order.id, 'ready')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <CheckCircle2 size={16} /> {t.kitchen.markReady}
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => onStatusChange(order.id, 'completed')}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <CheckCircle2 size={16} /> {t.kitchen.markCompleted}
          </button>
        )}
      </div>
    </div>
  )
}

function playNotificationSound() {
  try {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch {
    // Audio not available
  }
}
