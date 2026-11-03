import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, Minus, Plus, RotateCcw, UtensilsCrossed, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { calculateMonth, memberName } from '../lib/calc'
import {
  defaultDateForMonth,
  formatDate,
  formatMeals,
  formatMoney,
  formatMonth,
  todayISO,
} from '../lib/format'
import { friendlyError } from '../lib/errors'
import { Avatar, Badge, Button, EmptyState, Field, Input, MonthPicker, PageHeader, SectionTitle } from '../components/ui'

function dateInSelectedMonth(dateIso: string, month: Date): boolean {
  const [y, m] = dateIso.split('-').map(Number)
  return y === month.getFullYear() && m === month.getMonth() + 1
}

export function MealsPage() {
  const { activeMess, members, month, monthData, saveMeals, setMonth } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const [selectedDate, setSelectedDate] = useState(() => defaultDateForMonth(month))
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!dateInSelectedMonth(selectedDate, month)) {
      setSelectedDate(defaultDateForMonth(month))
    }
  }, [month, selectedDate])

  const activeForDate = useMemo(
    () =>
      members.filter((member) => {
        const joined = member.joined_at.slice(0, 10)
        return joined <= selectedDate && (!member.left_at || member.left_at >= selectedDate)
      }),
    [members, selectedDate],
  )

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const member of activeForDate) {
      const meal = monthData.meals.find(
        (item) => item.user_id === member.user_id && item.date === selectedDate,
      )
      next[member.user_id] = meal ? String(Number(meal.count)) : '0'
    }
    setCounts(next)
  }, [selectedDate, monthData.meals, members])

  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const summary = useMemo(
    () => calculateMonth(members, monthData.meals, monthData.expenses, monthData.deposits, start, end),
    [members, monthData, start, end],
  )

  const dailyTotal = activeForDate.reduce((sum, member) => sum + (Number(counts[member.user_id]) || 0), 0)

  const setCount = (userId: string, value: number) => {
    const safe = Math.max(0, Math.min(20, Math.round(value * 2) / 2))
    setCounts((prev) => ({ ...prev, [userId]: String(safe) }))
  }

  const setAll = (value: number) => {
    const next: Record<string, string> = {}
    for (const member of activeForDate) next[member.user_id] = String(value)
    setCounts(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const entries = activeForDate.map((member) => ({
        userId: member.user_id,
        count: Number(counts[member.user_id]) || 0,
      }))
      await saveMeals(selectedDate, entries)
      toast.success(`${formatDate(selectedDate, true)}-এর মিল সেভ হয়েছে।`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  if (members.length === 0) {
    return (
      <div>
        <PageHeader title="মিল" subtitle="প্রতিদিনের মিল সংখ্যা লিখুন।" actions={<MonthPicker />} />
        <div className="card">
          <EmptyState
            icon={Users}
            title="এখনো কোনো সদস্য নেই"
            description="সদস্য যোগ হলে তাদের মিল এখানে লিখতে পারবেন।"
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
        title="মিল"
        subtitle="একদিনের সব সদস্যের মিল একসাথে লিখে সেভ করুন।"
        actions={<MonthPicker />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Field label="তারিখ" htmlFor="meal-date" className="sm:max-w-52">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="meal-date"
                    type="date"
                    value={selectedDate}
                    min={start}
                    max={end}
                    onChange={(event) => setSelectedDate(event.target.value || defaultDateForMonth(month))}
                    className="pl-9"
                  />
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => setAll(2)}>
                  সবাই ২ মিল
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAll(0)} icon={RotateCcw}>
                  সবাই ০
                </Button>
                {selectedDate !== todayISO() ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMonth(new Date())
                      setSelectedDate(todayISO())
                    }}
                  >
                    আজ
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone="teal">{formatDate(selectedDate)}</Badge>
              <span>·</span>
              <span className="num font-semibold text-slate-700">{formatMeals(dailyTotal)} মিল</span>
              <span>·</span>
              <span>{activeForDate.length} জন সদস্য</span>
            </div>
          </div>

          {activeForDate.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="এই তারিখে কোনো সক্রিয় সদস্য নেই"
              description="সদস্য যোগ বা মেসে ফিরিয়ে আনার পর আবার চেষ্টা করুন।"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {activeForDate.map((member) => {
                const value = Number(counts[member.user_id]) || 0
                const row = summary.rows.find((item) => item.member.user_id === member.user_id)
                return (
                  <div key={member.user_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Avatar name={memberName(member)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-slate-800">{memberName(member)}</p>
                        {member.role === 'manager' ? <Badge tone="teal">ম্যানেজার</Badge> : null}
                      </div>
                      <p className="num mt-0.5 text-[11px] text-slate-500">
                        এ মাসে {formatMeals(row?.meals ?? 0)} মিল
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setCount(member.user_id, value - 0.5)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                        disabled={value <= 0}
                        aria-label={`${memberName(member)}-এর মিল কমান`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={20}
                        step={0.5}
                        value={counts[member.user_id] ?? '0'}
                        onChange={(event) => setCount(member.user_id, Number(event.target.value))}
                        className="num h-7 w-11 rounded-md border-0 bg-transparent text-center text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30"
                        aria-label={`${memberName(member)}-এর মিল`}
                      />
                      <button
                        type="button"
                        onClick={() => setCount(member.user_id, value + 0.5)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                        disabled={value >= 20}
                        aria-label={`${memberName(member)}-এর মিল বাড়ান`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs leading-relaxed text-slate-500">
              ০.৫ ধাপে মিল দিতে পারবেন (যেমন ১.৫)। সেভ করলে সাথে সাথে সবার ব্যালেন্স আপডেট হবে।
            </p>
            <Button onClick={handleSave} loading={saving} icon={Check} className="shrink-0">
              মিল সেভ করুন
            </Button>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-4 sm:p-5">
            <SectionTitle title="এই মাসের মিল" description={formatMonth(month)} />
            <div className="space-y-3">
              {summary.rows.length === 0 ? (
                <p className="text-sm text-slate-500">এখনো কোনো মিল নেই।</p>
              ) : (
                summary.rows
                  .slice()
                  .sort((a, b) => b.meals - a.meals)
                  .map((row) => {
                    const ratio = summary.totalMeals > 0 ? (row.meals / summary.totalMeals) * 100 : 0
                    return (
                      <div key={row.member.user_id}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-slate-700">{memberName(row.member)}</span>
                          <span className="num shrink-0 font-semibold text-slate-600">{formatMeals(row.meals)} মিল</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(ratio, row.meals > 0 ? 3 : 0)}%` }} />
                        </div>
                        <p className="num mt-1 text-[10px] text-slate-400">মিল খরচ {formatMoney(row.mealCost, currency)}</p>
                      </div>
                    )
                  })
              )}
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">মিল রেট</p>
            <p className="num mt-1 text-2xl font-bold text-slate-900">{formatMoney(summary.mealRate, currency)}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              মোট বাজার {formatMoney(summary.bazarTotal, currency)} ÷ মোট মিল {formatMeals(summary.totalMeals)}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
