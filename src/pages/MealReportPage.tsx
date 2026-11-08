import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck2,
  CalendarDays,
  Download,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { activeMembersInMonth, memberName } from '../lib/calc'
import { downloadCsv } from '../lib/export'
import {
  BN_MONTHS_SHORT,
  formatDate,
  formatMeals,
  formatMonth,
  monthKey,
  monthRange,
  todayISO,
} from '../lib/format'
import { Badge, Button, cn, EmptyState, MonthPicker, PageHeader, StatCard } from '../components/ui'
import type { Member } from '../lib/types'

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']

interface ReportDay {
  date: string
  day: number
  weekday: string
  meals: Map<string, number>
  total: number
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function memberWasActive(member: Member, date: string): boolean {
  const joined = member.joined_at.slice(0, 10)
  const left = member.left_at?.slice(0, 10) ?? null
  return joined <= date && (!left || left >= date)
}

export function MealReportPage() {
  const { activeMess, members, month, monthData } = useApp()
  const [onlyWithMeals, setOnlyWithMeals] = useState(false)
  const { start, end } = monthRange(month)

  const reportMembers = useMemo(
    () => activeMembersInMonth(members, start, end),
    [members, start, end],
  )

  const days = useMemo<ReportDay[]>(() => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const byDate = new Map<string, Map<string, number>>()

    for (const meal of monthData.meals) {
      const dateMeals = byDate.get(meal.date) ?? new Map<string, number>()
      dateMeals.set(meal.user_id, (dateMeals.get(meal.user_id) ?? 0) + Number(meal.count || 0))
      byDate.set(meal.date, dateMeals)
    }

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const date = isoDate(year, monthIndex, day)
      const dateMeals = byDate.get(date) ?? new Map<string, number>()
      const total = Array.from(dateMeals.values()).reduce((sum, count) => sum + count, 0)
      return {
        date,
        day,
        weekday: WEEKDAYS[new Date(year, monthIndex, day).getDay()],
        meals: dateMeals,
        total,
      }
    })
  }, [month, monthData.meals])

  const visibleDays = onlyWithMeals ? days.filter((day) => day.total > 0) : days
  const daysWithMeals = days.filter((day) => day.total > 0)
  const totalMeals = days.reduce((sum, day) => sum + day.total, 0)
  const memberTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const day of days) {
      for (const [userId, count] of day.meals) {
        totals.set(userId, (totals.get(userId) ?? 0) + count)
      }
    }
    return totals
  }, [days])
  const peakDay = days.reduce<ReportDay | null>(
    (peak, day) => (!peak || day.total > peak.total ? day : peak),
    null,
  )

  const handleCsv = () => {
    if (!activeMess) return
    const rows: string[][] = [
      ['মেস খাতা — মাসিক দৈনিক মিল রিপোর্ট'],
      ['মেস', activeMess.mess.name],
      ['মাস', formatMonth(month)],
      ['মোট মিল', formatMeals(totalMeals)],
      [],
      ['তারিখ', 'বার', ...reportMembers.map(memberName), 'দিনের মোট'],
      ...days.map((day) => [
        formatDate(day.date, true),
        day.weekday,
        ...reportMembers.map((member) =>
          memberWasActive(member, day.date)
            ? formatMeals(day.meals.get(member.user_id) ?? 0)
            : 'সক্রিয় ছিলেন না',
        ),
        formatMeals(day.total),
      ]),
      [],
      [
        'মাসের মোট',
        '',
        ...reportMembers.map((member) => formatMeals(memberTotals.get(member.user_id) ?? 0)),
        formatMeals(totalMeals),
      ],
    ]
    downloadCsv(`messkhata-meal-report-${monthKey(month)}.csv`, rows)
    toast.success('দৈনিক মিল রিপোর্ট CSV ডাউনলোড হয়েছে।')
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="মাসিক মিল রিপোর্ট"
        subtitle="কে কোন দিন কত মিল খেয়েছেন — পুরো মাসের স্বচ্ছ হিসাব।"
        actions={
          <>
            <MonthPicker />
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleCsv}
              disabled={reportMembers.length === 0}
            >
              CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="মোট মিল"
          value={formatMeals(totalMeals)}
          hint={formatMonth(month)}
          icon={UtensilsCrossed}
          tone="teal"
        />
        <StatCard
          label="মিল লেখা দিন"
          value={daysWithMeals.length}
          hint={`মোট ${days.length} দিনের মধ্যে`}
          icon={CalendarCheck2}
          tone="blue"
        />
        <StatCard
          label="দৈনিক গড়"
          value={formatMeals(daysWithMeals.length > 0 ? totalMeals / daysWithMeals.length : 0)}
          hint="মিল লেখা দিন অনুযায়ী"
          icon={TrendingUp}
          tone="violet"
        />
        <StatCard
          label="সদস্য"
          value={reportMembers.length}
          hint={peakDay && peakDay.total > 0 ? `সর্বোচ্চ ${formatMeals(peakDay.total)} মিল · ${formatDate(peakDay.date, true)}` : 'কোনো মিল লেখা হয়নি'}
          icon={Users}
          tone="amber"
        />
      </div>

      {reportMembers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="এই মাসে কোনো সক্রিয় সদস্য নেই"
            description="সদস্য যোগ হলে এখানে তাদের দৈনিক মিল রিপোর্ট দেখা যাবে।"
          />
        </div>
      ) : (
        <section id="meal-report-table" className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-teal-700" aria-hidden />
                <h2 className="text-base font-semibold text-slate-900">দিন অনুযায়ী মিল</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                ০ = মিল খাননি · — = ঐ দিনে সক্রিয় ছিলেন না · তারিখে চাপলে দিনের মিল খুলবে
              </p>
            </div>
            <div className="no-print flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setOnlyWithMeals(false)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  !onlyWithMeals ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                সব দিন ({days.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlyWithMeals(true)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  onlyWithMeals ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                মিল আছে ({daysWithMeals.length})
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-teal-50/60 px-4 py-2.5 text-xs text-teal-800 sm:hidden">
            সদস্যদের সব column দেখতে টেবিলটি ডানে-বামে scroll করুন।
          </div>

          {visibleDays.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="এই মাসে এখনো কোনো মিল লেখা হয়নি"
              description="‘সব দিন’ নির্বাচন করলে প্রতিদিনের শূন্য রিপোর্ট দেখা যাবে।"
            />
          ) : (
            <div className="scroll-thin max-h-[68dvh] overflow-auto print:max-h-none print:overflow-visible">
              <table
                className="w-full border-separate border-spacing-0 text-center text-sm"
                style={{ minWidth: `${Math.max(620, 210 + reportMembers.length * 116)}px` }}
              >
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="sticky left-0 z-30 min-w-28 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold">
                      তারিখ
                    </th>
                    {reportMembers.map((member) => (
                      <th key={member.user_id} className="min-w-28 border-b border-r border-slate-200 px-3 py-2.5 font-semibold">
                        <span className="block max-w-28 truncate text-slate-700" title={memberName(member)}>
                          {memberName(member)}
                        </span>
                        <span className="num mt-0.5 block text-[10px] font-medium text-teal-700">
                          {formatMeals(memberTotals.get(member.user_id) ?? 0)} মিল
                        </span>
                      </th>
                    ))}
                    <th className="min-w-24 border-b border-slate-200 bg-teal-50 px-3 py-3 font-semibold text-teal-800">
                      দিনের মোট
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDays.map((day) => {
                    const isToday = day.date === todayISO()
                    return (
                      <tr key={day.date} className={cn('group', isToday ? 'bg-amber-50/60' : 'hover:bg-slate-50/60')}>
                        <th
                          scope="row"
                          className={cn(
                            'sticky left-0 z-10 border-b border-r border-slate-100 px-3 py-2.5 text-left font-medium',
                            isToday ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              to={`/meals?date=${day.date}`}
                              className="num font-bold text-slate-800 transition hover:text-teal-700 hover:underline"
                              title={`${formatDate(day.date)}-এর মিল খুলুন`}
                            >
                              {String(day.day).padStart(2, '0')} {BN_MONTHS_SHORT[month.getMonth()]}
                            </Link>
                            {isToday ? <Badge tone="amber">আজ</Badge> : null}
                          </div>
                          <span className="mt-0.5 block text-[10px] text-slate-400">{day.weekday}</span>
                        </th>
                        {reportMembers.map((member) => {
                          const active = memberWasActive(member, day.date)
                          const count = day.meals.get(member.user_id) ?? 0
                          return (
                            <td
                              key={member.user_id}
                              className={cn(
                                'num border-b border-r border-slate-100 px-3 py-2.5',
                                !active && 'bg-slate-50/70 text-slate-300',
                              )}
                              title={!active ? `${memberName(member)} এই দিনে সক্রিয় সদস্য ছিলেন না` : undefined}
                            >
                              {!active ? (
                                '—'
                              ) : count > 0 ? (
                                <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-teal-50 px-2 py-1 font-bold text-teal-800 ring-1 ring-inset ring-teal-600/10">
                                  {formatMeals(count)}
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="num border-b border-slate-100 bg-teal-50/40 px-3 py-2.5 font-bold text-teal-900">
                          {formatMeals(day.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-20">
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky left-0 z-30 border-r border-slate-700 bg-slate-900 px-3 py-3 text-left text-xs font-semibold">
                      মাসের মোট
                    </th>
                    {reportMembers.map((member) => (
                      <td key={member.user_id} className="num border-r border-slate-700 px-3 py-3 font-bold">
                        {formatMeals(memberTotals.get(member.user_id) ?? 0)}
                      </td>
                    ))}
                    <td className="num bg-teal-700 px-3 py-3 text-base font-bold">{formatMeals(totalMeals)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
