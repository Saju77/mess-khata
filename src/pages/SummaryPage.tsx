import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Download, FileText, Printer, Share2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { balanceTone, calculateMonth, memberName } from '../lib/calc'
import { buildShareText, downloadCsv, summaryToCsv } from '../lib/export'
import { formatMeals, formatMoney, formatMonth, monthKey } from '../lib/format'
import { friendlyError } from '../lib/errors'
import { Badge, Button, EmptyState, MonthPicker, PageHeader, StatCard } from '../components/ui'

export function SummaryPage() {
  const { activeMess, members, month, monthData } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const messName = activeMess?.mess.name ?? 'মেস'

  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const summary = useMemo(
    () => calculateMonth(members, monthData.meals, monthData.expenses, monthData.deposits, start, end),
    [members, monthData, start, end],
  )

  const hasData = monthData.meals.length > 0 || monthData.expenses.length > 0 || monthData.deposits.length > 0

  const spendingRows = useMemo(() => {
    const map = new Map<string, { bazar: number; other: number }>()
    for (const expense of monthData.expenses) {
      const userId = expense.paid_by ?? expense.created_by
      if (!userId) continue
      const totals = map.get(userId) ?? { bazar: 0, other: 0 }
      if (expense.kind === 'bazar') totals.bazar += expense.amount
      else totals.other += expense.amount
      map.set(userId, totals)
    }
    return Array.from(map.entries())
      .map(([userId, totals]) => {
        const member = members.find((item) => item.user_id === userId)
        return {
          userId,
          name: member ? memberName(member) : 'সদস্য',
          bazar: totals.bazar,
          other: totals.other,
          total: totals.bazar + totals.other,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [monthData.expenses, members])

  const spendingTotal = spendingRows.reduce(
    (totals, row) => ({
      bazar: totals.bazar + row.bazar,
      other: totals.other + row.other,
      total: totals.total + row.total,
    }),
    { bazar: 0, other: 0, total: 0 },
  )

  const handleCsv = () => {
    if (!activeMess) return
    const rows = summaryToCsv(summary, activeMess.mess, month, monthData.expenses, members)
    downloadCsv(`messkhata-${monthKey(month)}.csv`, rows)
    toast.success('CSV ডাউনলোড হয়েছে।')
  }

  const handleShare = async () => {
    if (!activeMess) return
    const text = buildShareText(summary, activeMess.mess, month)
    if (navigator.share) {
      try {
        await navigator.share({ title: `${messName} — ${formatMonth(month)}`, text })
        return
      } catch {
        // cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('সারসংক্ষেপ কপি হয়েছে।')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="no-print">
        <PageHeader
          title="সারসংক্ষেপ"
          subtitle="মাস শেষের পূর্ণ হিসাব — কে কত পাবে, কে কত দেবে।"
          actions={
            <>
              <MonthPicker />
              <Button variant="secondary" icon={Download} onClick={handleCsv} disabled={!hasData}>
                CSV
              </Button>
              <Button variant="secondary" icon={Printer} onClick={() => window.print()} disabled={!hasData}>
                প্রিন্ট / PDF
              </Button>
              <Button icon={Share2} onClick={handleShare} disabled={!hasData}>
                শেয়ার
              </Button>
            </>
          }
        />
      </div>

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon={Calculator}
            title="এই মাসে হিসাব করার মতো তথ্য নেই"
            description="মিল, বাজার ও জমা যোগ করার পর এখানে পূর্ণ সারসংক্ষেপ দেখা যাবে।"
            action={
              <Link to="/meals">
                <Button icon={UtensilsCrossed}>মিল যোগ করুন</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="print-area space-y-4">
          <div className="hidden text-center print:block">
            <h1 className="text-xl font-bold text-slate-900">{messName}</h1>
            <p className="text-sm text-slate-600">মাসিক হিসাব — {formatMonth(month)}</p>
            <p className="mt-1 text-[10px] text-slate-400">তৈরি: {new Date().toLocaleDateString('en-GB')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="মোট মিল" value={formatMeals(summary.totalMeals)} hint={`${summary.activeMembers.length} জন সদস্য`} icon={UtensilsCrossed} tone="teal" />
            <StatCard label="মিল রেট" value={formatMoney(summary.mealRate, currency)} hint={`বাজার ${formatMoney(summary.bazarTotal, currency)}`} icon={Calculator} tone="violet" />
            <StatCard label="মোট জমা" value={formatMoney(summary.totalDeposits, currency)} hint={formatMonth(month)} icon={FileText} tone="emerald" />
            <StatCard
              label="মেস ফান্ড"
              value={formatMoney(summary.fundBalance, currency)}
              hint={`খরচ ${formatMoney(summary.totalExpenses, currency)}`}
              icon={Calculator}
              tone={summary.fundBalance < 0 ? 'rose' : 'teal'}
            />
          </div>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">সদস্য অনুযায়ী বিল</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  মিল রেট {formatMoney(summary.mealRate, currency)} · অন্যান্য ভাগ {formatMoney(summary.otherShare, currency)} / জন
                </p>
              </div>
              <Badge tone="slate">{summary.rows.length} জন</Badge>
            </div>

            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2.5 font-semibold sm:px-5">সদস্য</th>
                    <th className="px-3 py-2.5 text-right font-semibold">মিল</th>
                    <th className="px-3 py-2.5 text-right font-semibold">মিল খরচ</th>
                    <th className="px-3 py-2.5 text-right font-semibold">অন্যান্য</th>
                    <th className="px-3 py-2.5 text-right font-semibold">মোট বিল</th>
                    <th className="px-3 py-2.5 text-right font-semibold">জমা</th>
                    <th className="px-3 py-2.5 text-right font-semibold">ব্যালেন্স</th>
                    <th className="px-4 py-2.5 text-right font-semibold sm:px-5">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.rows.map((row) => {
                    const tone = balanceTone(row.balance)
                    return (
                      <tr key={row.member.user_id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 sm:px-5">
                          <p className="font-medium text-slate-800">{memberName(row.member)}</p>
                          <p className="text-[10px] text-slate-400">{row.member.role === 'manager' ? 'ম্যানেজার' : 'সদস্য'}</p>
                        </td>
                        <td className="num px-3 py-3 text-right text-slate-700">{formatMeals(row.meals)}</td>
                        <td className="num px-3 py-3 text-right text-slate-700">{formatMoney(row.mealCost, currency)}</td>
                        <td className="num px-3 py-3 text-right text-slate-700">{formatMoney(row.otherShare, currency)}</td>
                        <td className="num px-3 py-3 text-right font-semibold text-slate-800">{formatMoney(row.totalBill, currency)}</td>
                        <td className="num px-3 py-3 text-right text-emerald-700">{formatMoney(row.deposit, currency)}</td>
                        <td className={`num px-3 py-3 text-right font-bold ${tone === 'due' ? 'text-rose-600' : tone === 'advance' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {tone === 'settled' ? formatMoney(0, currency) : formatMoney(Math.abs(row.balance), currency)}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <Badge tone={tone === 'due' ? 'rose' : tone === 'advance' ? 'emerald' : 'slate'}>
                            {tone === 'due' ? 'দিতে হবে' : tone === 'advance' ? 'পাওনা' : 'সমান'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-700">
                    <td className="px-4 py-3 sm:px-5">মোট</td>
                    <td className="num px-3 py-3 text-right">{formatMeals(summary.totalMeals)}</td>
                    <td className="num px-3 py-3 text-right">{formatMoney(summary.totalMeals * summary.mealRate, currency)}</td>
                    <td className="num px-3 py-3 text-right">{formatMoney(summary.otherTotal, currency)}</td>
                    <td className="num px-3 py-3 text-right">{formatMoney(summary.totalExpenses, currency)}</td>
                    <td className="num px-3 py-3 text-right">{formatMoney(summary.totalDeposits, currency)}</td>
                    <td className="num px-3 py-3 text-right">{formatMoney(summary.fundBalance, currency)}</td>
                    <td className="px-4 py-3 sm:px-5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {spendingRows.length > 0 ? (
            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <h2 className="text-base font-semibold text-slate-900">কে কত খরচ করেছেন</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  বাজার ও অন্যান্য খরচ — শুধু রেকর্ডের জন্য, ব্যালেন্সের জমা হিসেবে ধরা হয়নি
                </p>
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2.5 font-semibold sm:px-5">সদস্য</th>
                      <th className="px-3 py-2.5 text-right font-semibold">বাজার</th>
                      <th className="px-3 py-2.5 text-right font-semibold">অন্যান্য</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {spendingRows.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800 sm:px-5">{row.name}</td>
                        <td className="num px-3 py-3 text-right text-amber-700">{formatMoney(row.bazar, currency)}</td>
                        <td className="num px-3 py-3 text-right text-sky-700">{formatMoney(row.other, currency)}</td>
                        <td className="num px-4 py-3 text-right font-semibold text-slate-800 sm:px-5">{formatMoney(row.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-700">
                      <td className="px-4 py-3 sm:px-5">মোট</td>
                      <td className="num px-3 py-3 text-right">{formatMoney(spendingTotal.bazar, currency)}</td>
                      <td className="num px-3 py-3 text-right">{formatMoney(spendingTotal.other, currency)}</td>
                      <td className="num px-4 py-3 text-right sm:px-5">{formatMoney(spendingTotal.total, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}

          <section className="card p-4 text-xs leading-relaxed text-slate-500 sm:p-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">হিসাবের সূত্র</h3>
            <ul className="space-y-1.5">
              <li>
                <strong className="text-slate-700">মিল রেট</strong> = (মোট বাজার + মিল রেটে যোগ করা অন্যান্য খরচ) ÷ মোট মিল
              </li>
              <li>
                <strong className="text-slate-700">মোট বিল</strong> = (নিজের মিল × মিল রেট) + অন্যান্য খরচের সমান ভাগ
              </li>
              <li>
                <strong className="text-slate-700">ব্যালেন্স</strong> = জমা − মোট বিল। ধনাত্মক = পাওনা, ঋণাত্মক = দিতে হবে।
              </li>
              <li>
                অন্যান্য খরচ মাসের সক্রিয় সদস্যদের মধ্যে সমান ভাগে ভাগ হয়। “মিল রেটে যোগ” করা খরচ মিল রেটের সাথে যায়।
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-400">
              এই রিপোর্টটি প্রিন্ট করে PDF হিসেবে সেভ করে রাখুন, অথবা CSV ডাউনলোড করে ব্যাকআপ রাখুন।
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
