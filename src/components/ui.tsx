import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  X,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { addMonths, isSameMonth, startOfMonth } from 'date-fns'
import { useApp } from '../context/AppContext'
import { balanceTone } from '../lib/calc'
import { formatMonth, formatMoney, initialOf } from '../lib/format'

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values)
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'dark'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-700 text-white shadow-sm hover:bg-teal-800 active:bg-teal-900 disabled:bg-teal-700/60',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  soft: 'bg-teal-50 text-teal-800 hover:bg-teal-100',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-11 gap-2 rounded-xl px-4 text-[15px]',
  lg: 'h-12 gap-2 rounded-xl px-5 text-base',
  icon: 'h-10 w-10 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-70',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'icon',
  icon: Icon,
  className,
  ...props
}: ButtonProps & { label: string; icon: LucideIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex select-none items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-60',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}

interface FieldProps {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:bg-slate-50 disabled:text-slate-500'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, 'appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, 'min-h-20 resize-y', className)} {...props} />
}

type Tone = 'teal' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue' | 'violet'

const toneSoft: Record<Tone, string> = {
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/10',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  slate: 'bg-slate-100 text-slate-600 ring-slate-600/10',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/10',
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        toneSoft[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const avatarTones = [
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
]

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const index = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarTones.length
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        avatarTones[index],
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initialOf(name)}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'teal',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('card card-hover p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="num mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {value}
          </p>
          {hint ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}
        </div>
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', toneSoft[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

export function BalanceBadge({
  balance,
  currency = '৳',
  compact = false,
}: {
  balance: number
  currency?: string
  compact?: boolean
}) {
  const tone = balanceTone(balance)
  if (tone === 'settled') {
    return (
      <Badge tone="slate">
        <Check className="h-3 w-3" /> সমান
      </Badge>
    )
  }
  return (
    <Badge tone={tone === 'due' ? 'rose' : 'emerald'}>
      {tone === 'due' ? 'দিতে হবে' : 'পাওনা'}
      {!compact ? ` ${formatMoney(Math.abs(balance), currency)}` : ''}
    </Badge>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-teal-700', className)} aria-hidden />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />
}

export function Alert({
  tone = 'info',
  title,
  children,
  onClose,
  className,
}: {
  tone?: 'info' | 'success' | 'error' | 'warning'
  title?: string
  children?: ReactNode
  onClose?: () => void
  className?: string
}) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }
  const Icon = tone === 'success' ? Check : tone === 'error' ? AlertCircle : tone === 'warning' ? AlertCircle : Info
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', styles[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'text-[13px] leading-relaxed opacity-90')}>{children}</div> : null}
      </div>
      {onClose ? (
        <button type="button" onClick={onClose} className="rounded-md p-0.5 opacity-60 hover:opacity-100" aria-label="বন্ধ করুন">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-pop-in sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          <IconButton label="বন্ধ করুন" icon={X} onClick={onClose} className="-mr-1 shrink-0" />
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'হ্যাঁ, নিশ্চিত',
  cancelLabel = 'বাতিল',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: React.ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children ?? (
        <p className="text-sm leading-relaxed text-slate-600">
          কাজটি চালিয়ে যেতে চাইলে নিচের বাটনে চাপুন।
        </p>
      )}
    </Modal>
  )
}

export function PageHeader({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
        {children}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    </div>
  )
}

export function MonthPicker({ compact = false }: { compact?: boolean }) {
  const { month, setMonth } = useApp()
  const current = startOfMonth(new Date())
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <IconButton
        label="আগের মাস"
        icon={ChevronLeft}
        size="sm"
        className="h-8 w-8"
        onClick={() => setMonth(addMonths(month, -1))}
      />
      <span className={cn('num px-1 text-center text-sm font-semibold text-slate-800', compact ? 'min-w-24' : 'min-w-32')}>
        {formatMonth(month)}
      </span>
      <IconButton
        label="পরের মাস"
        icon={ChevronRight}
        size="sm"
        className="h-8 w-8"
        onClick={() => setMonth(addMonths(month, 1))}
      />
      {!isSameMonth(month, current) ? (
        <button
          type="button"
          onClick={() => setMonth(current)}
          className="mr-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
        >
          আজ
        </button>
      ) : null}
    </div>
  )
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function CurrencyAmount({
  value,
  currency = '৳',
  className,
}: {
  value: number
  currency?: string
  className?: string
}) {
  return <span className={cn('num font-semibold', className)}>{formatMoney(value, currency)}</span>
}
