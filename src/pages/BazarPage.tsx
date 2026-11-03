import { useMemo, useState } from 'react'
import { CalendarDays, Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { dailyBazarTotals, memberName } from '../lib/calc'
import { defaultDateForMonth, formatDate, formatMoney, formatMonth } from '../lib/format'
import { friendlyError } from '../lib/errors'
import type { Expense } from '../lib/types'
import {
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

export function BazarPage() {
  const { activeMess, members, user, month, monthData, addExpense, updateExpense, deleteExpense } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [date, setDate] = useState(defaultDateForMonth(month))
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const bazar = useMemo(
    () =>
      monthData.expenses
        .filter((expense) => expense.kind === 'bazar')
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    [monthData.expenses],
  )

  const total = bazar.reduce((sum, expense) => sum + expense.amount, 0)
  const daily = useMemo(() => dailyBazarTotals(monthData.expenses, start, end), [monthData.expenses, start, end])
  const maxDaily = Math.max(...daily.map((item) => item.total), 1)

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const expense of bazar) {
      const list = map.get(expense.date) ?? []
      list.push(expense)
      map.set(expense.date, list)
    }
    return Array.from(map.entries())
  }, [bazar])

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
    setAmount('')
    setPaidBy(defaultPayer)
    setDescription('')
    setError(null)
    setOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setDate(expense.date)
    setAmount(String(expense.amount))
    setPaidBy(expense.paid_by ?? expense.created_by ?? defaultPayer)
    setDescription(expense.description)
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
      setError('কে বাজার করেছেন সেটি বেছে নিন।')
      return
    }
    setSaving(true)
    try {
      const input = {
        date,
        amount: numeric,
        kind: 'bazar' as const,
        category: 'bazar',
        description: description.trim() || 'বাজার',
        include_in_meal_rate: true,
        paid_by: paidBy,
      }
      if (editing) {
        await updateExpense(editing.id, input)
        toast.success('বাজারের এন্ট্রি আপডেট হয়েছে।')
      } else {
        await addExpense(input)
        toast.success('বাজার যোগ হয়েছে।')
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
        title="বাজার"
        subtitle="মেসের বাজারের খরচ লিখুন — এটাই মিল রেটে যোগ হবে।"
        actions={
          <>
            <MonthPicker />
            <Button icon={Plus} onClick={openAdd}>
              বাজার যোগ করুন
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="এই মাসের বাজার" value={formatMoney(total, currency)} hint={formatMonth(month)} icon={ShoppingBasket} tone="amber" />
        <StatCard label="মোট এন্ট্রি" value={String(bazar.length)} hint="বাজারের রেকর্ড" icon={CalendarDays} tone="slate" />
        <StatCard
          label="দৈনিক গড়"
          value={formatMoney(daily.filter((item) => item.total > 0).length ? total / daily.filter((item) => item.total > 0).length : 0, currency)}
          hint="যেদিন বাজার হয়েছে"
          icon={ShoppingBasket}
          tone="teal"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {daily.some((item) => item.total > 0) ? (
        <section className="card mt-4 p-4 sm:p-5">
          <SectionTitle title="দৈনিক বাজার" description={`${formatMonth(month)} — প্রতিদিনের খরচ`} />
          <div className="flex h-28 items-end gap-[3px] overflow-hidden">
            {daily.map((item) => {
              const height = item.total > 0 ? Math.max(8, (item.total / maxDaily) * 100) : 3
              return (
                <div key={item.date} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-[3px] transition ${item.total > 0 ? 'bg-teal-500/80 group-hover:bg-teal-600' : 'bg-slate-100'}`}
                    style={{ height: `${height}%` }}
                    title={`${formatDate(item.date, true)}: ${formatMoney(item.total, currency)}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="num mt-2 flex justify-between text-[10px] text-slate-400">
            <span>০১</span>
            <span>{String(endDate.getDate()).padStart(2, '0')}</span>
          </div>
        </section>
      ) : null}

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-semibold text-slate-900">বাজারের তালিকা</h2>
          <p className="mt-0.5 text-xs text-slate-500">তারিখ অনুযায়ী সাজানো</p>
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            icon={ShoppingBasket}
            title="এই মাসে কোনো বাজার নেই"
            description="প্রথম বাজারের খরচ যোগ করলে মিল রেট হিসাব শুরু হবে।"
            action={
              <Button icon={Plus} onClick={openAdd}>
                বাজার যোগ করুন
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {grouped.map(([groupDate, items]) => {
              const dayTotal = items.reduce((sum, item) => sum + item.amount, 0)
              return (
                <div key={groupDate}>
                  <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2 sm:px-5">
                    <p className="text-xs font-semibold text-slate-500">{formatDate(groupDate)}</p>
                    <p className="num text-xs font-bold text-slate-700">{formatMoney(dayTotal, currency)}</p>
                  </div>
                  {items.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <ShoppingBasket className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{expense.description || 'বাজার'}</p>
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
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'বাজার এডিট করুন' : 'নতুন বাজার'}
        description="বাজারের খরচ মিল রেটে যোগ হবে।"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button type="submit" form="bazar-form" loading={saving} icon={Plus}>
              {editing ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        }
      >
        <form id="bazar-form" onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="তারিখ" htmlFor="bazar-date">
              <Input id="bazar-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="টাকার পরিমাণ" htmlFor="bazar-amount">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">{currency}</span>
                <Input
                  id="bazar-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="০"
                  className="num pl-8"
                  required
                  autoFocus
                />
              </div>
            </Field>
          </div>
          <Field label="কে বাজার করেছেন?" htmlFor="bazar-paid-by" hint="যে সদস্য বাজার করেছেন">
            <Select id="bazar-paid-by" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} required>
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
          <Field label="বিবরণ" htmlFor="bazar-description" hint="যেমন: কাঁচাবাজার, মাছ, সবজি">
            <Textarea
              id="bazar-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="কী বাজার করা হয়েছে?"
              rows={3}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="বাজারের এন্ট্রি মুছবেন?"
        description={deleteTarget ? `${formatDate(deleteTarget.date)} — ${formatMoney(deleteTarget.amount, currency)}` : undefined}
        confirmLabel="মুছে ফেলুন"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
