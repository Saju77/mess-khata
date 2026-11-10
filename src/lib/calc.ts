import type {
  Deposit,
  Expense,
  Meal,
  Member,
  MonthSummary,
  MonthSummaryRow,
} from './types'

export function activeMembersInMonth(members: Member[], start: string, end: string): Member[] {
  return members
    .filter((member) => {
      const joined = member.joined_at.slice(0, 10)
      const left = member.left_at
      return joined <= end && (!left || left >= start)
    })
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
}

export function calculateMonth(
  members: Member[],
  meals: Meal[],
  expenses: Expense[],
  deposits: Deposit[],
  start: string,
  end: string,
  openingBalances: Record<string, number> = {},
): MonthSummary {
  const activeMembers = activeMembersInMonth(members, start, end)

  const totalMeals = meals.reduce((sum, meal) => sum + Number(meal.count || 0), 0)
  const bazarTotal = expenses
    .filter((expense) => expense.kind === 'bazar')
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const otherExpenses = expenses.filter((expense) => expense.kind === 'other')
  const otherTotal = otherExpenses
    .filter((expense) => !expense.include_in_meal_rate)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const mealPool =
    bazarTotal +
    otherExpenses
      .filter((expense) => expense.include_in_meal_rate)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0)
  const mealRate = totalMeals > 0 ? mealPool / totalMeals : 0
  const otherShare = activeMembers.length > 0 ? otherTotal / activeMembers.length : 0

  const mealsByMember = new Map<string, number>()
  for (const meal of meals) {
    mealsByMember.set(meal.user_id, (mealsByMember.get(meal.user_id) ?? 0) + Number(meal.count || 0))
  }

  const depositsByMember = new Map<string, number>()
  for (const deposit of deposits) {
    depositsByMember.set(
      deposit.user_id,
      (depositsByMember.get(deposit.user_id) ?? 0) + Number(deposit.amount || 0),
    )
  }

  const rows: MonthSummaryRow[] = activeMembers.map((member) => {
    const memberMeals = mealsByMember.get(member.user_id) ?? 0
    const mealCost = memberMeals * mealRate
    const totalBill = mealCost + otherShare
    const deposit = depositsByMember.get(member.user_id) ?? 0
    const openingBalance = openingBalances[member.user_id] ?? 0
    return {
      member,
      openingBalance,
      meals: memberMeals,
      mealCost,
      otherShare,
      totalBill,
      deposit,
      balance: openingBalance + deposit - totalBill,
    }
  })

  return {
    totalMeals,
    bazarTotal,
    otherTotal,
    mealPool,
    mealRate,
    totalExpenses,
    totalDeposits,
    fundBalance: totalDeposits - totalExpenses,
    otherShare,
    activeMembers,
    rows,
  }
}

export function dailyBazarTotals(expenses: Expense[], start: string, end: string) {
  const days: { date: string; total: number }[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  const totals = new Map<string, number>()
  for (const expense of expenses) {
    if (expense.kind !== 'bazar') continue
    totals.set(expense.date, (totals.get(expense.date) ?? 0) + Number(expense.amount || 0))
  }
  while (cursor <= last) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate(),
    ).padStart(2, '0')}`
    days.push({ date: iso, total: totals.get(iso) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function calculateOpeningBalances(
  members: Member[],
  priorMeals: Meal[],
  priorExpenses: Expense[],
  priorDeposits: Deposit[],
  beforeDate: string,
): Record<string, number> {
  const balances = new Map<string, number>()
  const months = new Set<string>()

  for (const meal of priorMeals) if (meal.date < beforeDate) months.add(meal.date.slice(0, 7))
  for (const expense of priorExpenses) if (expense.date < beforeDate) months.add(expense.date.slice(0, 7))
  for (const deposit of priorDeposits) if (deposit.date < beforeDate) months.add(deposit.date.slice(0, 7))

  for (const monthKey of [...months].sort()) {
    const [year, month] = monthKey.split('-').map(Number)
    const start = `${monthKey}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`

    const monthMeals = priorMeals.filter((meal) => meal.date >= start && meal.date <= end)
    const monthExpenses = priorExpenses.filter((expense) => expense.date >= start && expense.date <= end)
    const monthDeposits = priorDeposits.filter((deposit) => deposit.date >= start && deposit.date <= end)

    const summary = calculateMonth(members, monthMeals, monthExpenses, monthDeposits, start, end)
    for (const row of summary.rows) {
      balances.set(row.member.user_id, (balances.get(row.member.user_id) ?? 0) + row.balance)
    }
  }

  return Object.fromEntries(balances)
}

export function balanceTone(balance: number): 'due' | 'advance' | 'settled' {
  if (Math.abs(balance) < 0.005) return 'settled'
  return balance > 0 ? 'advance' : 'due'
}

export function memberName(member: Member): string {
  return member.profile.full_name || member.profile.email || 'নামহীন সদস্য'
}

export function totalMealsForDate(meals: Meal[], date: string): number {
  return meals
    .filter((meal) => meal.date === date)
    .reduce((sum, meal) => sum + Number(meal.count || 0), 0)
}
