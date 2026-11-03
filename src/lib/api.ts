import type { SupabaseConfig } from './config'
import type {
  ActivityLogEntry,
  Deposit,
  DepositInput,
  Expense,
  ExpenseInput,
  Meal,
  MealEntry,
  Member,
  Membership,
  Mess,
  MonthData,
  SessionUser,
} from './types'

export interface SignUpResult {
  needsConfirmation: boolean
}

export interface Api {
  readonly mode: 'cloud' | 'demo'

  getSession(): Promise<SessionUser | null>
  onAuthChange(callback: (user: SessionUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(name: string, email: string, password: string): Promise<SignUpResult>
  signOut(): Promise<void>

  listMemberships(): Promise<Membership[]>
  createMess(name: string): Promise<Mess>
  joinMess(code: string): Promise<Mess>
  updateMess(messId: string, patch: { name?: string; currency?: string }): Promise<void>
  leaveMess(messId: string): Promise<void>
  regenerateInvite(messId: string): Promise<string>
  listMembers(messId: string): Promise<Member[]>
  removeMember(messId: string, userId: string): Promise<void>
  transferManager(messId: string, newManagerUserId: string): Promise<void>

  loadMonth(messId: string, start: string, end: string): Promise<MonthData>
  saveMeals(messId: string, date: string, entries: MealEntry[]): Promise<void>

  addExpense(messId: string, input: ExpenseInput): Promise<void>
  updateExpense(id: string, messId: string, input: ExpenseInput): Promise<void>
  deleteExpense(id: string, messId: string): Promise<void>

  addDeposit(messId: string, input: DepositInput): Promise<void>
  updateDeposit(id: string, messId: string, input: DepositInput): Promise<void>
  deleteDeposit(id: string, messId: string): Promise<void>

  listActivity(messId: string, limit?: number, offset?: number): Promise<ActivityLogEntry[]>

  subscribe(messId: string, onChange: () => void): () => void

  getInitialMonth(): Date
  resetDemo?(): Promise<void>
}

export type { Deposit, Expense, Meal, Member, Membership, Mess, MonthData }
export type { SupabaseConfig }

export async function createApi(mode: 'cloud' | 'demo', config: SupabaseConfig | null): Promise<Api> {
  if (mode === 'demo') {
    const { createDemoApi } = await import('./demoApi')
    return createDemoApi()
  }
  if (!config) throw new Error('Supabase কনফিগারেশন পাওয়া যায়নি।')
  const { createCloudApi } = await import('./cloudApi')
  return createCloudApi(config)
}
