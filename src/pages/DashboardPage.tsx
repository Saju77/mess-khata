import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSameMonth } from 'date-fns'
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  Check,
  Clock3,
  ReceiptText,
  ShoppingBasket,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { balanceTone, calculateMonth, entryStatus, memberName, totalMealsForDate } from '../lib/calc'
import {
  formatDate,
  formatMeals,
  formatMoney,
  formatMonth,
  todayISO,
} from '../lib/format'
import { friendlyError } from '../lib/errors'
import type { EntryStatus } from '../lib/types'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  MonthPicker,
  PageHeader,
  SectionTitle,
  StatCard,
} from '../components/ui'

export function DashboardPage() {
  const { activeMess, members, month, monthData, dataLoading, user, setEntryStatus } = useApp()
  const navigate = useNavigate()
  const [acting, setActing] = useState(false)

  const currency = activeMess?.mess.currency || '৳'
  const isManager = activeMess?.role === 'manager'
  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const summary = useMemo(
    () => calculateMonth(members, monthData.meals, monthData.expenses, monthData.deposits, start, end, monthData.openingBalances),
    [members, monthData, start, end],
  )

  const currentMonth = isSameMonth(month, new Date())
  const todayMeals = totalMealsForDate(monthData.meals, todayISO())
  const eatingToday = monthData.meals.filter(
    (meal) => meal.date === todayISO() && meal.count > 0 && entryStatus(meal) === 'approved',
  ).length

  // approval: অনুমোদনের অপেক্ষায় থাকা ইনপুট
  const pendingMeals = monthData.meals.filter(
    (meal) => entryStatus(meal) === 'pending' && Number(meal.count) > 0,
  )
  const pendingExpenses = monthData.expenses.filter((expense) => entryStatus(expense) === 'pending')
  const myPendingCount =
    !isManager && user
      ? pendingMeals.filter((meal) => meal.user_id === user.id).length +
        pendingExpenses.filter((expense) => expense.created_by === user.id).length
      : 0

  const handleDecision = async (
    entity: 'meal' | 'expense',
    id: string,
    status: EntryStatus,
  ) => {
    setActing(true)
    try {
      await setEntryStatus(entity, [id], status)
      toast.success(status === 'approved' ? 'অনুমোদন হয়েছে।' : 'বাতিল করা হয়েছে।')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setActing(false)
    }
  }
  const quickEntries = [
    { label: 'মিল', icon: UtensilsCrossed, to: '/meals', tone: 'bg-teal-50 text-teal-700' },
    { label: 'বাজার', icon: ShoppingBasket, to: '/bazar', tone: 'bg-amber-50 text-amber-700' },
    ...(activeMess?.role === 'manager'
      ? [{ label: 'জমা', icon: Wallet, to: '/deposits', tone: 'bg-emerald-50 text-emerald-700' }]
      : []),
  ]

  const recent = useMemo(() => {
    const expenses = monthData.expenses.map((expense) => {
      const payer = members.find((item) => item.user_id === (expense.paid_by ?? expense.created_by))
      return {
        type: 'expense' as const,
        id: expense.id,
        date: expense.date,
        createdAt: expense.created_at,
        title: expense.description || (expense.kind === 'bazar' ? 'বাজার' : 'অন্যান্য খরচ'),
        amount: expense.amount,
        kind: expense.kind,
        byName: payer ? memberName(payer) : null,
        status: entryStatus(expense),
      }
    })
    const deposits = monthData.deposits.map((deposit) => {
      const member = members.find((item) => item.user_id === deposit.user_id)
      return {
        type: 'deposit' as const,
        id: deposit.id,
        date: deposit.date,
        createdAt: deposit.created_at,
        title: `${member ? memberName(member) : 'সদস্য'} — জমা`,
        amount: deposit.amount,
        kind: 'deposit' as const,
        byName: null,
        status: null,
      }
    })
    return [...expenses, ...deposits]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
  }, [monthData.expenses, monthData.deposits, members])

  const hasData =
    monthData.meals.length > 0 || monthData.expenses.length > 0 || monthData.deposits.length > 0

  const sortedRows = useMemo(
    () => [...summary.rows].sort((a, b) => a.balance - b.balance),
    [summary.rows],
  )

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'শুভ সকাল'
    if (hour < 17) return 'শুভ অপরাহ্ন'
    if (hour < 20) return 'শুভ সন্ধ্যা'
    return 'শুভ রাত্রি'
  })()

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="ড্যাশবোর্ড"
        subtitle={`${greeting}${user ? `, ${user.name.split(' ')[0]}` : ''} — ${formatMonth(month)}-এর হিসাব এক নজরে।`}
        actions={<MonthPicker />}
      />

      {!hasData && !dataLoading ? (
        <div className="card">
          <EmptyState
            icon={UtensilsCrossed}
            title="এই মাসে এখনো কোনো এন্ট্রি নেই"
            description="শুরু করতে আজকের মিল লিখুন, অথবা প্রথম বাজারের খরচ যোগ করুন।"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={UtensilsCrossed} onClick={() => navigate('/meals')}>
                  মিল লিখুন
                </Button>
                <Button variant="secondary" icon={ShoppingBasket} onClick={() => navigate('/bazar')}>
                  বাজার যোগ করুন
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="মোট মিল"
              value={formatMeals(summary.totalMeals)}
              hint={`${summary.activeMembers.length} জন সদস্য`}
              icon={UtensilsCrossed}
              tone="teal"
            />
            <StatCard
              label="মোট বাজার"
              value={formatMoney(summary.bazarTotal, currency)}
              hint={summary.otherTotal > 0 ? `অন্যান্য ${formatMoney(summary.otherTotal, currency)}` : 'এই মাসে'}
              icon={ShoppingBasket}
              tone="amber"
            />
            <StatCard
              label="মিল রেট"
              value={formatMoney(summary.mealRate, currency)}
              hint="প্রতি মিল"
              icon={Calculator}
              tone="violet"
            />
            <StatCard
              label="মেস ফান্ড"
              value={formatMoney(summary.fundBalance, currency)}
              hint={`জমা ${formatMoney(summary.totalDeposits, currency)}`}
              icon={Wallet}
              tone={summary.fundBalance < 0 ? 'rose' : 'emerald'}
            />
          </div>

          {isManager && pendingMeals.length + pendingExpenses.length > 0 ? (
            <section className="card mt-4 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="flex items-center gap-1.5 text-base font-semibold text-amber-900">
                    <Clock3 className="h-4 w-4" /> ⏳ {pendingMeals.length + pendingExpenses.length} টি ইনপুট অনুমোদনের অপেক্ষায়
                  </h2>
                  <p className="mt-0.5 text-xs text-amber-700">
                    অনুমোদন না করলে এগুলো কোনো হিসাবে যোগ হবে না
                  </p>
                </div>
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {pendingMeals.map((meal) => {
                  const member = members.find((item) => item.user_id === meal.user_id)
                  return (
                    <div key={`meal-${meal.id}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <UtensilsCrossed className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {member ? memberName(member) : 'সদস্য'} — {formatMeals(meal.count)} মিল
                        </p>
                        <p className="text-[11px] text-slate-500">{formatDate(meal.date, true)}</p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton
                          label="অনুমোদন"
                          icon={Check}
                          size="sm"
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          disabled={acting}
                          onClick={() => handleDecision('meal', meal.id, 'approved')}
                        />
                        <IconButton
                          label="বাতিল"
                          icon={X}
                          size="sm"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          disabled={acting}
                          onClick={() => handleDecision('meal', meal.id, 'rejected')}
                        />
                      </div>
                    </div>
                  )
                })}
                {pendingExpenses.map((expense) => (
                  <div key={`expense-${expense.id}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        expense.kind === 'bazar' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {expense.kind === 'bazar' ? <ShoppingBasket className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {expense.description || (expense.kind === 'bazar' ? 'বাজার' : 'অন্যান্য খরচ')} ·{' '}
                        <span className="num">{formatMoney(expense.amount, currency)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">{formatDate(expense.date, true)}</p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <IconButton
                        label="অনুমোদন"
                        icon={Check}
                        size="sm"
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        disabled={acting}
                        onClick={() => handleDecision('expense', expense.id, 'approved')}
                      />
                      <IconButton
                        label="বাতিল"
                        icon={X}
                        size="sm"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        disabled={acting}
                        onClick={() => handleDecision('expense', expense.id, 'rejected')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!isManager && myPendingCount > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              ⏳ আপনার {myPendingCount} টি ইনপুট ম্যানেজারের অনুমোদনের অপেক্ষায় — অনুমোদন না হওয়া পর্যন্ত হিসাবে যোগ হবে না।
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="card lg:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">সদস্যদের ব্যালেন্স</h2>
                  <p className="mt-0.5 text-xs text-slate-500">জমা − (মিল খরচ + অন্যান্য ভাগ)</p>
                </div>
                <Link
                  to="/summary"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  বিস্তারিত <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {sortedRows.length === 0 ? (
                <EmptyState icon={Wallet} title="কোনো সদস্য নেই" description="মেসে সদস্য যোগ হলে তাদের ব্যালেন্স এখানে দেখা যাবে।" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedRows.map((row) => {
                    const tone = balanceTone(row.balance)
                    return (
                      <div key={row.member.user_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <Avatar name={memberName(row.member)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-slate-800">{memberName(row.member)}</p>
                            {row.member.role === 'manager' ? <Badge tone="teal">ম্যানেজার</Badge> : null}
                          </div>
                          <p className="num mt-0.5 text-[11px] text-slate-500">
                            {formatMeals(row.meals)} মিল · বিল {formatMoney(row.totalBill, currency)} · জমা {formatMoney(row.deposit, currency)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`num text-sm font-bold ${
                              tone === 'due' ? 'text-rose-600' : tone === 'advance' ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {tone === 'settled' ? 'সমান' : formatMoney(Math.abs(row.balance), currency)}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            {tone === 'due' ? 'দিতে হবে' : tone === 'advance' ? 'পাওনা' : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="space-y-4">
              <section className="card overflow-hidden">
                <div className="bg-gradient-to-br from-teal-700 to-teal-900 px-5 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-teal-100/80">
                      {currentMonth ? 'আজকের মিল' : 'এই মাসের মিল'}
                    </p>
                    <CalendarDays className="h-4 w-4 text-teal-200/70" />
                  </div>
                  <p className="num mt-2 text-3xl font-bold">{formatMeals(currentMonth ? todayMeals : summary.totalMeals)}</p>
                  <p className="mt-1 text-xs text-teal-100/70">
                    {currentMonth ? `${eatingToday} জন আজ খাচ্ছেন` : `${summary.activeMembers.length} জন সদস্য`}
                  </p>
                </div>
                <div className="p-4">
                  <Button variant="soft" size="sm" className="w-full" icon={UtensilsCrossed} onClick={() => navigate('/meals')}>
                    মিল এডিট করুন
                  </Button>
                </div>
              </section>

              <section className="card p-4">
                <SectionTitle title="দ্রুত এন্ট্রি" />
                <div className={quickEntries.length === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
                  {quickEntries.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 px-2 py-3 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm"
                    >
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${item.tone}`}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="card mt-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">সাম্প্রতিক খরচ ও জমা</h2>
                <p className="mt-0.5 text-xs text-slate-500">{formatMonth(month)}-এর সর্বশেষ এন্ট্রি</p>
              </div>
              <Link to="/bazar" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <EmptyState icon={ReceiptText} title="এখনো কোনো খরচ বা জমা নেই" />
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        item.type === 'deposit' ? 'bg-emerald-50 text-emerald-700' : item.kind === 'bazar' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {item.type === 'deposit' ? <Wallet className="h-4 w-4" /> : item.kind === 'bazar' ? <ShoppingBasket className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                        {item.type === 'expense' && item.status === 'pending' ? (
                          <Badge tone="amber">অপেক্ষমাণ</Badge>
                        ) : null}
                        {item.type === 'expense' && item.status === 'rejected' ? (
                          <Badge tone="rose">বাতিল</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatDate(item.date, true)}
                        {item.byName ? ` · ${item.byName}` : ''}
                      </p>
                    </div>
                    <p className={`num shrink-0 text-sm font-semibold ${item.type === 'deposit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {item.type === 'deposit' ? '+' : '−'}
                      {formatMoney(item.amount, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {dataLoading ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" /> ডেটা লোড হচ্ছে...
        </div>
      ) : null}
    </div>
  )
}
