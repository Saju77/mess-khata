import {
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns'

export const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

export const BN_MONTHS_SHORT = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রি',
  'মে',
  'জুন',
  'জুলা',
  'আগ',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
]

export function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayISO(): string {
  return toISO(new Date())
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(iso: string, short = false): string {
  if (!iso) return ''
  const date = iso.length === 10 ? fromISO(iso) : new Date(iso)
  const month = short ? BN_MONTHS_SHORT[date.getMonth()] : BN_MONTHS[date.getMonth()]
  return `${String(date.getDate()).padStart(2, '0')} ${month} ${date.getFullYear()}`
}

export function formatMonth(date: Date): string {
  return `${BN_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatMonthShort(date: Date): string {
  return `${BN_MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${formatDate(toISO(date), true)}, ${format(date, 'hh:mm a')}`
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatMoney(value: number, currency = '৳'): string {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
  const digits = Number.isInteger(rounded) ? 0 : 2
  const sign = rounded < 0 ? '−' : ''
  return `${sign}${currency}${formatNumber(Math.abs(rounded), digits)}`
}

export function formatMeals(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1)
}

export function monthRange(date: Date): { start: string; end: string } {
  return {
    start: toISO(startOfMonth(date)),
    end: toISO(endOfMonth(date)),
  }
}

export function monthBounds(date: Date): { min: string; max: string } {
  const { start, end } = monthRange(date)
  return { min: start, max: end }
}

export function isCurrentMonth(date: Date): boolean {
  return isSameMonth(date, new Date())
}

export function defaultDateForMonth(date: Date): string {
  const now = new Date()
  if (isSameMonth(date, now)) return toISO(now)
  return toISO(startOfMonth(date))
}

export function initialOf(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function relativeDayLabel(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'আজ'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === toISO(yesterday)) return 'গতকাল'
  return formatDate(iso, true)
}

export function parseDateSafe(iso: string): Date {
  try {
    return parseISO(iso)
  } catch {
    return new Date()
  }
}

export function monthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}
