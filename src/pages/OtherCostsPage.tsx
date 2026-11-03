import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Flame,
  Home,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Wifi,
  Wrench,
  Zap,
  Droplets,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { memberName } from '../lib/calc'
import { defaultDateForMonth, formatDate, formatMoney, formatMonth } from '../lib/format'
import { friendlyError } from '../lib/errors'
import type { Expense } from '../lib/types'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  MonthPicker,
  PageHeader,
  SectionTitle,
  Select,
  StatCard,
  Textarea,
} from '../components/ui'

const CATEGORIES = [
  { value: 'rent', label: 'বাড়ি ভাড়া', icon: Home, tone: 'violet' as const },
  { value: 'wifi', label: 'ওয়াইফাই', icon: Wifi, tone: 'blue' as const },
  { value: 'gas', label: 'গ্যাস', icon: Flame, tone: 'amber' as const },
  { value: 'electricity', label: 'বিদ্যুৎ', icon: Zap, tone: 'amber' as const },
  { value: 'water', label: 'পানি', icon: Droplets, tone: 'blue' as const },
  { value: 'service', label: 'সার্ভিস চার্জ', icon: Wrench, tone: 'slate' as const },
  { value: 'other', label: 'অন্যান্য', icon: ReceiptText, tone: 'slate' as const },
]

function categoryMeta(value: string) {
  return CATEGORIES.find((item) => item.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
}

export function OtherCostsPage() {
  const { activeMess, members, user, month, monthData, addExpense, updateExpense, deleteExpense } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [date, setDate] = useState(defaultDateForMonth(month))
  const [category, setCategory] = useState('rent')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [description, setDescription] = useState('')
  const [includeInRate, setIncludeInRate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  const other = useMemo(
    () =>
      monthData.expenses
        .filter((expense) => expense.kind === 'other')
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    [monthData.expenses],
  )

  const total = other.reduce((sum, expense) => sum + expense.amount, 0)
  const equalSplitTotal = other.filter((expense) => !expense.include_in_meal_rate).reduce((sum, expense) => sum + expense.amount, 0)
  const includedTotal = total - equalSplitTotal

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const expense of other) {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount)
    }
    return CATEGORIES.map((item) => ({ ...item, total: map.get(item.value) ?? 0 })).filter((item) => item.total > 0)
  }, [other])

  const maxCategory = Math.max(...byCategory.map((item) => item.total), 1)

  const activeMembers = members.filter((member) => !member.left_at)
  const defaultPayer =
    user && activeMembers.some((member) => member.user_id === user.id)
      ? user.id
      : activeMembers[0]?.user_id ?? ''
  const payerOptions = members.filter((member) => !member.left_at || member.user_id === paidBy)
  const payerName = (expense: Expense) => {
    const member = members.find((item) => item.user_id === (expense.paid_by ?? expense.created_by))
    return member ? memberName(member) : 'সদস্য'
  }

  const openAdd = () => {
    setEditing(null)
    setDate(defaultDateForMonth(month))
    setCategory('rent')
    setAmount('')
    setPaidBy(defaultPayer)
    setDescription('')
    setIncludeInRate(false)
    setError(null)
    setOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setDate(expense.date)
    setCategory(expense.category)
    setAmount(String(expense.amount))
    setPaidBy(expense.paid_by ?? expense.created_by ?? defaultPayer)
    setDescription(expense.description)
    setIncludeInRate(expense.include_in_meal_rate)
    setError(null)
    setOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const numeric = Number(amount)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('সঠিক টাকার পরিমাণ লিখুন।')
      return
    }
    if (!paidBy) {
      setError('কে খরচটি করেছেন সেটি বেছে নিন।')
      return
    }
    setSaving(true)
    try {
      const input = {
        date,
        amount: numeric,
        kind: 'other' as const,
        category,
        description: description.trim() || categoryMeta(category).label,
        include_in_meal_rate: includeInRate,
        paid_by: paidBy,
      }
      if (editing) {
        await updateExpense(editing.id, input)
        toast.success('খরচের এন্ট্রি আপডেট হয়েছে।')
      } else {
        await addExpense(input)
        toast.success('খরচ যোগ হয়েছে।')
      }
      setOpen(false)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExpense(deleteTarget.id)
      toast.success('এন্ট্রি মুছে ফেলা হয়েছে।')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="অন্যান্য খরচ"
        subtitle="বাড়ি ভাড়া, ওয়াইফাই, গ্যাস, বিদ্যুৎ — বাজারের বাইরের খরচ।"
        actions={
          <>
            <MonthPicker />
            <Button icon={Plus} onClick={openAdd}>
              খরচ যোগ করুন
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="মোট অন্যান্য খরচ" value={formatMoney(total, currency)} hint={formatMonth(month)} icon={ReceiptText} tone="blue" />
        <StatCard label="সমান ভাগে" value={formatMoney(equalSplitTotal, currency)} hint="সদস্যদের মধ্যে ভাগ হবে" icon={CalendarDays} tone="amber" />
        <StatCard label="মিল রেটে যোগ" value={formatMoney(includedTotal, currency)} hint="মিল রেটের সাথে যাবে" icon={ReceiptText} tone="teal" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-sky-900">
        <strong>হিসাবের নিয়ম:</strong> “মিল রেটে যোগ করুন” টিক না দিলে এই খরচটি মাসের সক্রিয় সদস্যদের মধ্যে সমান ভাগে ভাগ হবে। টিক দিলে খরচটি মিল রেটের সাথে যোগ হবে।
      </div>

      {byCategory.length > 0 ? (
        <section className="card mt-4 p-4 sm:p-5">
          <SectionTitle title="ক্যাটাগরি অনুযায়ী" description={formatMonth(month)} />
          <div className="space-y-3">
            {byCategory.map((item) => (
              <div key={item.value}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <item.icon className="h-3.5 w-3.5 text-slate-400" /> {item.label}
                  </span>
                  <span className="num font-semibold text-slate-700">{formatMoney(item.total, currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, (item.total / maxCategory) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-semibold text-slate-900">খরচের তালিকা</h2>
          <p className="mt-0.5 text-xs text-slate-500">তারিখ অনুযায়ী সাজানো</p>
        </div>

        {other.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="এই মাসে কোনো অন্যান্য খরচ নেই"
            description="বাড়ি ভাড়া বা ইউটিলিটি বিল যোগ করলে হিসাব আরও নির্ভুল হবে।"
            action={
              <Button icon={Plus} onClick={openAdd}>
                খরচ যোগ করুন
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {other.map((expense) => {
              const meta = categoryMeta(expense.category)
              return (
                <div key={expense.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-800">{expense.description || meta.label}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {expense.include_in_meal_rate ? <Badge tone="teal">মিল রেটে</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatDate(expense.date, true)} · <span className="font-medium text-slate-600">{payerName(expense)}</span>
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm font-bold text-slate-800">{formatMoney(expense.amount, currency)}</p>
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton label="এডিট" icon={Pencil} size="sm" className="h-8 w-8" onClick={() => openEdit(expense)} />
                    <IconButton
                      label="ডিলিট"
                      icon={Trash2}
                      size="sm"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => setDeleteTarget(expense)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'খরচ এডিট করুন' : 'নতুন খরচ'}
        description="বাজারের বাইরের যেকোনো মেস খরচ।"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button type="submit" form="other-form" loading={saving} icon={Plus}>
              {editing ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        }
      >
        <form id="other-form" onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="তারিখ" htmlFor="other-date">
              <Input id="other-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="ক্যাটাগরি" htmlFor="other-category">
              <Select id="other-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="কে খরচ করেছেন?" htmlFor="other-paid-by" hint="যিনি বিল বা খরচটি দিয়েছেন">
            <Select id="other-paid-by" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} required>
              {payerOptions.length === 0 ? <option value="">কোনো সদস্য নেই</option> : null}
              {payerOptions.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {memberName(member)}
                  {member.user_id === user?.id ? ' (আপনি)' : ''}
                  {member.left_at ? ' (বের হয়েছেন)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="টাকার পরিমাণ" htmlFor="other-amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">{currency}</span>
              <Input
                id="other-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="০"
                className="num pl-8"
                required
              />
            </div>
          </Field>
          <Field label="বিবরণ" htmlFor="other-description" hint="ঐচ্ছিক">
            <Textarea
              id="other-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="যেমন: নভেম্বর মাসের বাড়ি ভাড়া"
              rows={2}
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
            <input
              type="checkbox"
              checked={includeInRate}
              onChange={(event) => setIncludeInRate(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-800">মিল রেটে যোগ করুন</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                টিক না দিলে খরচটি সদস্যদের মধ্যে সমান ভাগে ভাগ হবে।
              </span>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="খরচের এন্ট্রি মুছবেন?"
        description={deleteTarget ? `${formatDate(deleteTarget.date)} — ${formatMoney(deleteTarget.amount, currency)}` : undefined}
        confirmLabel="মুছে ফেলুন"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
