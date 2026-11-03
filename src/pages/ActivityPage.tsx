import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  History,
  Info,
  Lock,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingBasket,
  Trash2,
  UserMinus,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { formatDate, formatDateTime, formatMeals, formatMoney } from '../lib/format'
import type { ActivityEntity, ActivityLogEntry } from '../lib/types'
import { Avatar, Badge, Button, EmptyState, PageHeader, Skeleton, cn } from '../components/ui'

type Filter = 'all' | ActivityEntity

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'expense', label: 'খরচ' },
  { value: 'deposit', label: 'জমা' },
  { value: 'meal', label: 'মিল' },
  { value: 'member', label: 'সদস্য' },
]

const ACTION_META = {
  insert: { label: 'যোগ', tone: 'emerald', icon: Plus },
  update: { label: 'এডিট', tone: 'amber', icon: Pencil },
  delete: { label: 'ডিলিট', tone: 'rose', icon: Trash2 },
} as const

const KIND_LABELS: Record<string, string> = {
  bazar: 'বাজার',
  other: 'অন্যান্য খরচ',
}

const CATEGORY_LABELS: Record<string, string> = {
  bazar: 'বাজার',
  rent: 'বাড়ি ভাড়া',
  wifi: 'ওয়াইফাই',
  gas: 'গ্যাস',
  electricity: 'বিদ্যুৎ',
  water: 'পানি',
  service: 'সার্ভিস চার্জ',
  other: 'অন্যান্য',
}

function asString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function roleLabel(role: string): string {
  if (role === 'manager') return 'ম্যানেজার'
  if (role === 'member') return 'সদস্য'
  return role || '—'
}

interface Change {
  label: string
  from: string
  to: string
}

function buildChanges(
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  fields: { key: string; label: string; format?: (value: unknown) => string }[],
): Change[] {
  const changes: Change[] = []
  for (const field of fields) {
    const before = asString(oldRow[field.key])
    const after = asString(newRow[field.key])
    if (before === after) continue
    const format = field.format ?? ((value: unknown) => asString(value) || '—')
    changes.push({ label: field.label, from: format(oldRow[field.key]), to: format(newRow[field.key]) })
  }
  return changes
}

function entityMeta(entry: ActivityLogEntry) {
  const row = (entry.action === 'delete' ? entry.old_data : entry.data) ?? {}
  if (entry.entity === 'expense') {
    return asString(row.kind) === 'bazar'
      ? { label: 'বাজার', icon: ShoppingBasket, tone: 'bg-teal-50 text-teal-700' }
      : { label: 'অন্যান্য খরচ', icon: ReceiptText, tone: 'bg-violet-50 text-violet-700' }
  }
  if (entry.entity === 'deposit') {
    return { label: 'জমা', icon: Wallet, tone: 'bg-emerald-50 text-emerald-700' }
  }
  if (entry.entity === 'meal') {
    return { label: 'মিল', icon: UtensilsCrossed, tone: 'bg-amber-50 text-amber-700' }
  }
  return { label: 'সদস্য', icon: Users, tone: 'bg-sky-50 text-sky-700' }
}

interface Description {
  title: string
  detail?: string
  changes: Change[]
}

function describeEntry(
  entry: ActivityLogEntry,
  nameById: Map<string, string>,
  currency: string,
): Description {
  const row = (entry.action === 'delete' ? entry.old_data : entry.data) ?? {}
  const oldRow = entry.old_data ?? {}
  const money = (value: unknown) => formatMoney(asNumber(value), currency)
  const memberOf = (value: unknown) => nameById.get(asString(value)) || 'সদস্য'

  if (entry.entity === 'expense') {
    const kind = asString(row.kind) || asString(oldRow.kind)
    const what = KIND_LABELS[kind] ?? 'খরচ'
    const description = asString(row.description) || asString(oldRow.description) || what
    const amount = money(row.amount || oldRow.amount)
    const date = asString(row.date) || asString(oldRow.date)
    const payer = row.paid_by ?? oldRow.paid_by

    if (entry.action === 'insert') {
      return {
        title: `${what} যোগ করেছেন`,
        detail: `${description} · ${amount} · ${formatDate(date, true)}${payer ? ` · ${memberOf(payer)}` : ''}`,
        changes: [],
      }
    }
    if (entry.action === 'delete') {
      return {
        title: `${what} মুছে ফেলেছেন`,
        detail: `${description} · ${amount} · ${formatDate(date, true)}${payer ? ` · ${memberOf(payer)}` : ''}`,
        changes: [],
      }
    }
    return {
      title: `${what} এডিট করেছেন`,
      detail: `${description} · ${formatDate(date, true)}`,
      changes: buildChanges(oldRow, row, [
        { key: 'amount', label: 'টাকা', format: money },
        { key: 'description', label: 'বিবরণ' },
        { key: 'date', label: 'তারিখ', format: (value) => formatDate(asString(value), true) },
        { key: 'kind', label: 'ধরন', format: (value) => KIND_LABELS[asString(value)] ?? asString(value) },
        {
          key: 'category',
          label: 'খাত',
          format: (value) => CATEGORY_LABELS[asString(value)] ?? asString(value),
        },
        { key: 'paid_by', label: 'কে করেছেন', format: memberOf },
        {
          key: 'include_in_meal_rate',
          label: 'মিল রেটে',
          format: (value) => (value ? 'হ্যাঁ' : 'না'),
        },
      ]),
    }
  }

  if (entry.entity === 'deposit') {
    const member = memberOf(row.user_id || oldRow.user_id)
    const amount = money(row.amount || oldRow.amount)
    const date = asString(row.date) || asString(oldRow.date)

    if (entry.action === 'insert') {
      return {
        title: 'জমা যোগ করেছেন',
        detail: `${member} · ${amount} · ${formatDate(date, true)}`,
        changes: [],
      }
    }
    if (entry.action === 'delete') {
      return {
        title: 'জমা মুছে ফেলেছেন',
        detail: `${member} · ${amount} · ${formatDate(date, true)}`,
        changes: [],
      }
    }
    return {
      title: 'জমা এডিট করেছেন',
      detail: `${member} · ${formatDate(date, true)}`,
      changes: buildChanges(oldRow, row, [
        { key: 'amount', label: 'টাকা', format: money },
        { key: 'user_id', label: 'সদস্য', format: memberOf },
        { key: 'date', label: 'তারিখ', format: (value) => formatDate(asString(value), true) },
        { key: 'note', label: 'নোট' },
      ]),
    }
  }

  if (entry.entity === 'meal') {
    const member = memberOf(row.user_id || oldRow.user_id)
    const date = asString(row.date) || asString(oldRow.date)
    const count = asNumber(row.count || oldRow.count)

    if (entry.action === 'insert') {
      return {
        title: 'মিল যোগ করেছেন',
        detail: `${member} · ${formatDate(date, true)} · ${formatMeals(count)} মিল`,
        changes: [],
      }
    }
    if (entry.action === 'delete') {
      return {
        title: 'মিল মুছে ফেলেছেন',
        detail: `${member} · ${formatDate(date, true)} · ${formatMeals(count)} মিল`,
        changes: [],
      }
    }
    return {
      title: 'মিল পরিবর্তন করেছেন',
      detail: `${member} · ${formatDate(date, true)}`,
      changes: buildChanges(oldRow, row, [
        { key: 'count', label: 'মিল', format: (value) => `${formatMeals(asNumber(value))} মিল` },
        { key: 'date', label: 'তারিখ', format: (value) => formatDate(asString(value), true) },
        { key: 'user_id', label: 'সদস্য', format: memberOf },
      ]),
    }
  }

  const target = nameById.get(asString(row.user_id || oldRow.user_id)) || 'সদস্য'
  const oldRole = asString(oldRow.role)
  const newRole = asString(row.role)
  const wasActive = !oldRow.left_at
  const isActive = !row.left_at
  const changes: Change[] = []
  if (oldRole && newRole && oldRole !== newRole) {
    changes.push({ label: 'ভূমিকা', from: roleLabel(oldRole), to: roleLabel(newRole) })
  }
  if (oldRole && !wasActive !== !isActive) {
    changes.push({ label: 'অবস্থা', from: wasActive ? 'সক্রিয়' : 'সরানো', to: isActive ? 'সক্রিয়' : 'সরানো' })
  }

  if (entry.action === 'insert') {
    return { title: `${target} মেসে যোগ দিয়েছেন`, changes }
  }
  if (entry.action === 'delete') {
    return { title: `${target}-কে মেস থেকে সরানো হয়েছে`, changes }
  }
  if (newRole === 'manager' && oldRole !== 'manager') {
    return { title: `${target}-কে ম্যানেজার বানানো হয়েছে`, changes }
  }
  if (oldRole === 'manager' && newRole === 'member') {
    return { title: `${target} আর ম্যানেজার নন`, changes }
  }
  if (!isActive && wasActive) {
    return { title: `${target}-কে সরিয়ে দেওয়া হয়েছে`, changes }
  }
  return { title: `${target}-এর তথ্য পরিবর্তন হয়েছে`, changes }
}

function ActivityCard({
  entry,
  nameById,
  currency,
}: {
  entry: ActivityLogEntry
  nameById: Map<string, string>
  currency: string
}) {
  const memberRemoval =
    entry.entity === 'member' &&
    entry.action === 'update' &&
    Boolean((entry.data as Record<string, unknown> | null)?.left_at) &&
    !(entry.old_data as Record<string, unknown> | null)?.left_at
  const memberRoleChange =
    entry.entity === 'member' &&
    entry.action === 'update' &&
    entry.data?.role !== entry.old_data?.role

  const action = memberRemoval
    ? { label: 'অপসারণ', tone: 'rose' as const, icon: UserMinus }
    : memberRoleChange
      ? { label: 'ভূমিকা', tone: 'amber' as const, icon: Users }
      : ACTION_META[entry.action]
  const entity = entityMeta(entry)
  const description = describeEntry(entry, nameById, currency)
  const ActionIcon = action.icon
  const EntityIcon = entity.icon

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar name={entry.actor_name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-slate-900">{entry.actor_name}</p>
            <Badge tone={action.tone}>
              <ActionIcon className="h-3 w-3" aria-hidden /> {action.label}
            </Badge>
            <span className="text-[11px] text-slate-400">{formatDateTime(entry.created_at)}</span>
          </div>

          <div className="mt-2 flex items-start gap-2">
            <span
              className={cn(
                'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                entity.tone,
              )}
            >
              <EntityIcon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-700">{description.title}</p>
              {description.detail ? (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description.detail}</p>
              ) : null}
            </div>
          </div>

          {description.changes.length > 0 ? (
            <div className="mt-2.5 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/70 px-3">
              {description.changes.map((change) => (
                <div key={change.label} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5 text-xs">
                  <span className="font-medium text-slate-500">{change.label}:</span>
                  <span className="text-slate-400 line-through">{change.from || '—'}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-semibold text-slate-700">{change.to || '—'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ActivityPage() {
  const { activeMess, members, loadActivity, refreshTick, user } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const isManager = activeMess?.role === 'manager'
  const [items, setItems] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      map.set(member.user_id, member.profile.full_name || member.profile.email || 'সদস্য')
    }
    if (user) map.set(user.id, user.name || user.email)
    return map
  }, [members, user])

  const reload = useCallback(
    async (quiet = false) => {
      if (!isManager) {
        setItems([])
        setLoading(false)
        return
      }
      if (!quiet) setLoading(true)
      try {
        setItems(await loadActivity(150))
      } catch (err) {
        toast.error(friendlyError(err))
      } finally {
        setLoading(false)
      }
    },
    [isManager, loadActivity],
  )

  useEffect(() => {
    void reload(true)
  }, [reload, refreshTick])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.entity === filter)),
    [items, filter],
  )

  if (!isManager) {
    return (
      <div>
        <PageHeader title="অ্যাক্টিভিটি" subtitle="কে কখন কী যোগ, এডিট বা মুছে ফেলেছেন।" />
        <div className="card">
          <EmptyState
            icon={Lock}
            title="শুধু ম্যানেজার দেখতে পারবেন"
            description="মেসের হিসাবের প্রতিটি পরিবর্তনের রেকর্ড শুধু ম্যানেজার দেখতে পারেন।"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="অ্যাক্টিভিটি"
        subtitle="কে কখন কী যোগ, এডিট বা মুছে ফেলেছেন — সব রেকর্ড এখানে।"
        actions={
          <Button variant="secondary" icon={RefreshCw} loading={loading} onClick={() => void reload()}>
            রিফ্রেশ
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p className="leading-relaxed">
          প্রতিটি যোগ, এডিট ও ডিলিট স্বয়ংক্রিয়ভাবে রেকর্ড হয়। তাই কে কী বদলেছেন তা সবসময় জানা যাবে।
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              filter === item.value
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            {item.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{filtered.length}টি রেকর্ড</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={History}
            title={items.length === 0 ? 'এখনো কোনো অ্যাক্টিভিটি নেই' : 'এই ধরনের কোনো রেকর্ড নেই'}
            description={
              items.length === 0
                ? 'কেউ মিল, বাজার, জমা বা সদস্য পরিবর্তন করলে এখানে দেখা যাবে।'
                : 'অন্য ধরনের রেকর্ড দেখতে ফিল্টার বদলান।'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <ActivityCard key={entry.id} entry={entry} nameById={nameById} currency={currency} />
          ))}
        </div>
      )}
    </div>
  )
}
