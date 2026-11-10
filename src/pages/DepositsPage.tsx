import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Pencil, Plus, Trash2, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { memberName } from '../lib/calc'
import { defaultDateForMonth, formatDate, formatMoney, formatMonth } from '../lib/format'
import { friendlyError } from '../lib/errors'
import type { Deposit } from '../lib/types'
import {
  Avatar,
  Alert,
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

export function DepositsPage() {
  const { activeMess, members, user, month, monthData, addDeposit, updateDeposit, deleteDeposit } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const isManager = activeMess?.role === 'manager'
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Deposit | null>(null)
  const [date, setDate] = useState(defaultDateForMonth(month))
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Deposit | null>(null)
  const [deleting, setDeleting] = useState(false)

  const defaultUserId = members.find((member) => member.user_id === user?.id)?.user_id ?? members[0]?.user_id ?? ''

  const deposits = useMemo(
    () =>
      monthData.deposits
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    [monthData.deposits],
  )

  const total = deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

  const byMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const deposit of deposits) {
      map.set(deposit.user_id, (map.get(deposit.user_id) ?? 0) + deposit.amount)
    }
    return members
      .map((member) => ({
        member,
        total: map.get(member.user_id) ?? 0,
        opening: monthData.openingBalances[member.user_id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [deposits, members, monthData.openingBalances])

  const maxMemberTotal = Math.max(...byMember.map((item) => item.total), 1)

  const grouped = useMemo(() => {
    const map = new Map<string, Deposit[]>()
    for (const deposit of deposits) {
      const list = map.get(deposit.date) ?? []
      list.push(deposit)
      map.set(deposit.date, list)
    }
    return Array.from(map.entries())
  }, [deposits])

  const openAdd = () => {
    if (!isManager) return
    setEditing(null)
    setDate(defaultDateForMonth(month))
    setUserId(defaultUserId)
    setAmount('')
    setNote('')
    setError(null)
    setOpen(true)
  }

  const openEdit = (deposit: Deposit) => {
    if (!isManager) return
    setEditing(deposit)
    setDate(deposit.date)
    setUserId(deposit.user_id)
    setAmount(String(deposit.amount))
    setNote(deposit.note ?? '')
    setError(null)
    setOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!isManager) {
      setError('জমা যোগ বা পরিবর্তন শুধু ম্যানেজার করতে পারবেন।')
      return
    }
    const numeric = Number(amount)
    if (!userId) {
      setError('সদস্য নির্বাচন করুন।')
      return
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('সঠিক টাকার পরিমাণ লিখুন।')
      return
    }
    setSaving(true)
    try {
      const input = { date, user_id: userId, amount: numeric, note }
      if (editing) {
        await updateDeposit(editing.id, input)
        toast.success('জমার এন্ট্রি আপডেট হয়েছে।')
      } else {
        await addDeposit(input)
        toast.success('জমা যোগ হয়েছে।')
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
    if (!isManager) {
      toast.error('জমা মুছতে শুধু ম্যানেজারের অনুমতি আছে।')
      return
    }
    setDeleting(true)
    try {
      await deleteDeposit(deleteTarget.id)
      toast.success('এন্ট্রি মুছে ফেলা হয়েছে।')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setDeleting(false)
    }
  }

  if (members.length === 0) {
    return (
      <div>
        <PageHeader
          title="জমা"
          subtitle={isManager ? 'সদস্যদের জমা টাকা লিখুন।' : 'সদস্যদের জমা টাকার হিসাব দেখুন।'}
          actions={<MonthPicker />}
        />
        <div className="card">
          <EmptyState
            icon={Users}
            title="এখনো কোনো সদস্য নেই"
            description={isManager ? 'সদস্য যোগ হলে তাদের জমা এখানে লিখতে পারবেন।' : 'সদস্য যোগ হলে তাদের জমার হিসাব এখানে দেখা যাবে।'}
            action={
              <Link to="/members">
                <Button icon={Users}>সদস্য দেখুন</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="জমা"
        subtitle={isManager ? 'কোন সদস্য কত টাকা মেসে জমা দিয়েছেন, সেটি লিখুন।' : 'ম্যানেজারের যোগ করা সদস্যদের জমার হিসাব দেখুন।'}
        actions={
          <>
            <MonthPicker />
            {isManager ? (
              <Button icon={Plus} onClick={openAdd}>
                জমা যোগ করুন
              </Button>
            ) : null}
          </>
        }
      />

      {!isManager ? (
        <Alert tone="info" title="জমা নিয়ন্ত্রণ ম্যানেজারের হাতে">
          আপনি সব সদস্যের জমার হিসাব দেখতে পারবেন। তবে জমা যোগ, এডিট বা মুছতে শুধু ম্যানেজারের অনুমতি আছে।
        </Alert>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="মোট জমা" value={formatMoney(total, currency)} hint={formatMonth(month)} icon={Wallet} tone="emerald" />
        <StatCard label="জমার এন্ট্রি" value={String(deposits.length)} hint="এই মাসে" icon={CalendarDays} tone="slate" />
        <StatCard
          label="সদস্য প্রতি গড়"
          value={formatMoney(byMember.filter((item) => item.total > 0).length ? total / byMember.filter((item) => item.total > 0).length : 0, currency)}
          hint="যারা জমা দিয়েছেন"
          icon={Users}
          tone="teal"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="card p-4 sm:p-5">
          <SectionTitle title="সদস্য অনুযায়ী জমা" description={formatMonth(month)} />
          <div className="space-y-3">
            {byMember.map(({ member, total: memberTotal, opening }) => (
              <div key={member.user_id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={memberName(member)} size="sm" className="h-6 w-6 text-[10px]" />
                    <div className="min-w-0">
                      <span className="truncate text-xs font-medium text-slate-700">{memberName(member)}</span>
                      {opening !== 0 ? (
                        <p className={`num text-[10px] ${opening > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          পূর্বের: {formatMoney(opening, currency)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="num shrink-0 text-xs font-semibold text-slate-700">{formatMoney(memberTotal, currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${memberTotal > 0 ? Math.max(4, (memberTotal / maxMemberTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <h2 className="text-base font-semibold text-slate-900">জমার তালিকা</h2>
            <p className="mt-0.5 text-xs text-slate-500">তারিখ অনুযায়ী সাজানো</p>
          </div>

          {grouped.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="এই মাসে কোনো জমা নেই"
              description={isManager ? 'সদস্যদের জমা যোগ করলে তাদের ব্যালেন্স হিসাব হবে।' : 'ম্যানেজার জমা যোগ করলে এখানে দেখা যাবে।'}
              action={isManager ? <Button icon={Plus} onClick={openAdd}>জমা যোগ করুন</Button> : undefined}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map(([groupDate, items]) => (
                <div key={groupDate}>
                  <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2 sm:px-5">
                    <p className="text-xs font-semibold text-slate-500">{formatDate(groupDate)}</p>
                    <p className="num text-xs font-bold text-slate-700">
                      {formatMoney(items.reduce((sum, item) => sum + item.amount, 0), currency)}
                    </p>
                  </div>
                  {items.map((deposit) => {
                    const member = members.find((item) => item.user_id === deposit.user_id)
                    return (
                      <div key={deposit.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <Avatar name={member ? memberName(member) : 'সদস্য'} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {member ? memberName(member) : 'সদস্য'}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {deposit.note || 'জমা'} · {formatDate(deposit.date, true)}
                          </p>
                        </div>
                        <p className="num shrink-0 text-sm font-bold text-emerald-600">+{formatMoney(deposit.amount, currency)}</p>
                        {isManager ? (
                          <div className="flex shrink-0 gap-0.5">
                            <IconButton label="এডিট" icon={Pencil} size="sm" className="h-8 w-8" onClick={() => openEdit(deposit)} />
                            <IconButton
                              label="ডিলিট"
                              icon={Trash2}
                              size="sm"
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteTarget(deposit)}
                            />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {isManager ? <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'জমা এডিট করুন' : 'নতুন জমা'}
        description="কে কত টাকা মেসে জমা দিয়েছেন?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              বাতিল
            </Button>
            <Button type="submit" form="deposit-form" loading={saving} icon={Plus}>
              {editing ? 'আপডেট করুন' : 'যোগ করুন'}
            </Button>
          </div>
        }
      >
        <form id="deposit-form" onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="তারিখ" htmlFor="deposit-date">
              <Input id="deposit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="সদস্য" htmlFor="deposit-member">
              <Select id="deposit-member" value={userId} onChange={(event) => setUserId(event.target.value)} required>
                <option value="">সদস্য নির্বাচন করুন</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {memberName(member)}
                    {member.left_at ? ' (বের হয়েছেন)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="টাকার পরিমাণ" htmlFor="deposit-amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">{currency}</span>
              <Input
                id="deposit-amount"
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
          <Field label="নোট" htmlFor="deposit-note" hint="ঐচ্ছিক">
            <Textarea
              id="deposit-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="যেমন: মাসের শুরুতে জমা"
              rows={2}
            />
          </Field>
        </form>
      </Modal> : null}

      {isManager ? <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="জমার এন্ট্রি মুছবেন?"
        description={deleteTarget ? `${formatDate(deleteTarget.date)} — ${formatMoney(deleteTarget.amount, currency)}` : undefined}
        confirmLabel="মুছে ফেলুন"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      /> : null}
    </div>
  )
}
