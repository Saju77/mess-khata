import { balanceTone, memberName } from './calc'
import { formatDate, formatMeals, formatMoney, formatMonth } from './format'
import type { Expense, Member, Mess, MonthSummary } from './types'

function escapeCell(value: string): string {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function downloadCsv(filename: string, rows: string[][]) {
  const content = '\uFEFF' + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function summaryToCsv(
  summary: MonthSummary,
  mess: Mess,
  month: Date,
  expenses: Expense[] = [],
  members: Member[] = [],
): string[][] {
  const currency = mess.currency || '৳'
  const rows: string[][] = [
    ['মেস খাতা — মাসিক সারসংক্ষেপ'],
    ['মেস', mess.name],
    ['মাস', formatMonth(month)],
    ['মিল রেট', formatMoney(summary.mealRate, currency)],
    ['মোট মিল', formatMeals(summary.totalMeals)],
    ['মোট বাজার', formatMoney(summary.bazarTotal, currency)],
    ['অন্যান্য খরচ', formatMoney(summary.otherTotal, currency)],
    ['মোট জমা', formatMoney(summary.totalDeposits, currency)],
    ['মেস ফান্ড', formatMoney(summary.fundBalance, currency)],
    [],
    ['সদস্য', 'মিল', 'মিল খরচ', 'অন্যান্য ভাগ', 'মোট বিল', 'জমা', 'ব্যালেন্স', 'অবস্থা'],
    ...summary.rows.map((row) => {
      const tone = balanceTone(row.balance)
      const status = tone === 'due' ? 'দিতে হবে' : tone === 'advance' ? 'পাওনা' : 'সমান'
      return [
        memberName(row.member),
        formatMeals(row.meals),
        formatMoney(row.mealCost, currency),
        formatMoney(row.otherShare, currency),
        formatMoney(row.totalBill, currency),
        formatMoney(row.deposit, currency),
        formatMoney(row.balance, currency),
        status,
      ]
    }),
    [],
    ['মিল রেট সূত্র', '(বাজার + মিল রেটে যোগ করা অন্যান্য খরচ) ÷ মোট মিল'],
    ['ব্যালেন্স সূত্র', 'জমা − (মিল খরচ + অন্যান্য খরচের সমান ভাগ)'],
  ]

  if (expenses.length > 0) {
    const memberMap = new Map(members.map((member) => [member.user_id, member]))
    const spending = new Map<string, { bazar: number; other: number }>()
    for (const expense of expenses) {
      const userId = expense.paid_by ?? expense.created_by
      if (!userId) continue
      const totals = spending.get(userId) ?? { bazar: 0, other: 0 }
      if (expense.kind === 'bazar') totals.bazar += expense.amount
      else totals.other += expense.amount
      spending.set(userId, totals)
    }

    const spendingRows = Array.from(spending.entries())
      .map(([userId, totals]) => {
        const member = memberMap.get(userId)
        return {
          userId,
          name: member ? memberName(member) : 'সদস্য',
          bazar: totals.bazar,
          other: totals.other,
          total: totals.bazar + totals.other,
        }
      })
      .sort((a, b) => b.total - a.total)

    rows.push(
      [],
      ['সদস্য অনুযায়ী খরচ (শুধু রেকর্ডের জন্য — ব্যালেন্সে জমা হিসেবে ধরা হয়নি)'],
      ['সদস্য', 'বাজার', 'অন্যান্য', 'মোট'],
    )
    for (const row of spendingRows) {
      rows.push([
        row.name,
        formatMoney(row.bazar, currency),
        formatMoney(row.other, currency),
        formatMoney(row.total, currency),
      ])
    }
    rows.push([
      'মোট',
      formatMoney(spendingRows.reduce((sum, row) => sum + row.bazar, 0), currency),
      formatMoney(spendingRows.reduce((sum, row) => sum + row.other, 0), currency),
      formatMoney(spendingRows.reduce((sum, row) => sum + row.total, 0), currency),
    ])

    rows.push([], ['খরচের বিবরণ'], ['তারিখ', 'ধরন', 'বিবরণ', 'কে করেছেন', 'পরিমাণ'])
    for (const expense of [...expenses].sort(
      (a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at),
    )) {
      const userId = expense.paid_by ?? expense.created_by
      const member = userId ? memberMap.get(userId) : undefined
      rows.push([
        formatDate(expense.date),
        expense.kind === 'bazar' ? 'বাজার' : 'অন্যান্য',
        expense.description || (expense.kind === 'bazar' ? 'বাজার' : 'অন্যান্য খরচ'),
        member ? memberName(member) : '—',
        formatMoney(expense.amount, currency),
      ])
    }
  }

  return rows
}

export function buildShareText(summary: MonthSummary, mess: Mess, month: Date): string {
  const currency = mess.currency || '৳'
  const lines = [
    `🍽️ ${mess.name} — ${formatMonth(month)}`,
    `মিল রেট: ${formatMoney(summary.mealRate, currency)}`,
    `মোট মিল: ${formatMeals(summary.totalMeals)}`,
    '',
    ...summary.rows.map((row) => {
      const tone = balanceTone(row.balance)
      const status = tone === 'due' ? 'দিতে হবে' : tone === 'advance' ? 'পাওনা' : 'সমান'
      return `${memberName(row.member)}: ${formatMoney(Math.abs(row.balance), currency)} ${status}`
    }),
    '',
    '— মেস খাতা',
  ]
  return lines.join('\n')
}
