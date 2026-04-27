import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { t } from '../../lib/i18n'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/30',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/30',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
        'disabled:bg-slate-50 disabled:text-slate-500',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const CARD_PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ className, padded = true, padding, ...props }: CardProps) {
  const padClass = padding !== undefined ? CARD_PADDING[padding] : padded ? 'p-6' : ''
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        padClass,
        className,
      )}
      {...props}
    />
  )
}

type BadgeTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate' | 'indigo' | 'amber'

const BADGE_CLASSES: Record<BadgeTone, string> = {
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  red: 'bg-rose-100 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200',
}

export function Badge({
  tone,
  color,
  className,
  children,
}: {
  tone?: BadgeTone
  color?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  const effectiveTone: BadgeTone = tone ?? color ?? 'slate'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        BADGE_CLASSES[effectiveTone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
  )
}

const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
  awaiting_payment: 'amber',
  pending: 'indigo',
  preparing: 'yellow',
  ready: 'green',
  completed: 'slate',
  cancelled: 'red',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: t.order.status.awaiting_payment,
  pending: t.order.status.pending,
  preparing: t.order.status.preparing,
  ready: t.order.status.ready,
  completed: t.order.status.completed,
  cancelled: t.order.status.cancelled,
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status] ?? 'slate'}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
