export type Role = 'manager' | 'member'
export type ExpenseKind = 'bazar' | 'other'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface Profile {
  id: string
  full_name: string
  email: string | null
}

export interface Mess {
  id: string
  name: string
  currency: string
  invite_code: string
  owner_id: string
  created_at: string
}

export interface Member {
  user_id: string
  role: Role
  joined_at: string
  left_at: string | null
  profile: Profile
}

export interface Membership {
  mess: Mess
  role: Role
  joined_at: string
  left_at: string | null
}

export interface Meal {
  id: string
  mess_id: string
  user_id: string
  date: string
  count: number
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Expense {
  id: string
  mess_id: string
  date: string
  amount: number
  kind: ExpenseKind
  category: string
  description: string
  include_in_meal_rate: boolean
  paid_by: string | null
  created_by: string | null
  created_at: string
}

export interface Deposit {
  id: string
  mess_id: string
  user_id: string
  date: string
  amount: number
  note: string | null
  created_by: string | null
  created_at: string
}

export interface MonthData {
  meals: Meal[]
  expenses: Expense[]
  deposits: Deposit[]
  openingBalances: Record<string, number>
}

export interface ExpenseInput {
  date: string
  amount: number
  kind: ExpenseKind
  category: string
  description: string
  include_in_meal_rate: boolean
  paid_by: string
}

export interface DepositInput {
  date: string
  user_id: string
  amount: number
  note: string
}

export interface MealEntry {
  userId: string
  count: number
}

export interface MonthSummaryRow {
  member: Member
  openingBalance: number
  meals: number
  mealCost: number
  otherShare: number
  totalBill: number
  deposit: number
  balance: number
}

export interface MonthSummary {
  totalMeals: number
  bazarTotal: number
  otherTotal: number
  mealPool: number
  mealRate: number
  totalExpenses: number
  totalDeposits: number
  fundBalance: number
  otherShare: number
  activeMembers: Member[]
  rows: MonthSummaryRow[]
}

export type ActivityAction = 'insert' | 'update' | 'delete'
export type ActivityEntity = 'expense' | 'deposit' | 'meal' | 'member'

export interface ActivityLogEntry {
  id: string
  mess_id: string
  actor_id: string | null
  actor_name: string
  action: ActivityAction
  entity: ActivityEntity
  entity_id: string
  data: Record<string, unknown> | null
  old_data: Record<string, unknown> | null
  created_at: string
}
