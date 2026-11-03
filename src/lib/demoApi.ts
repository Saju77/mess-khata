import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns'
import type { Api, SignUpResult } from './api'
import type {
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
  Profile,
  SessionUser,
} from './types'

const DB_KEY = 'messkhata.demo.db.v1'
const DEMO_USER_ID = 'demo-user-rahim'

interface DemoMembership {
  user_id: string
  role: 'manager' | 'member'
  joined_at: string
  left_at: string | null
}

interface DemoDb {
  profiles: Profile[]
  mess: Mess
  members: DemoMembership[]
  meals: Meal[]
  expenses: Expense[]
  deposits: Deposit[]
}

const BUYERS = [
  'কাঁচাবাজার',
  'মাছ ও মাংস',
  'সবজি বাজার',
  'মুদি বাজার',
  'ডিম ও দুধ',
  'চাল ও ডাল',
  'তেল ও মসলা',
  'ফলমূল',
  'মুরগি',
  'বাজার (সাপ্তাহিক)',
]

const BAZAR_AMOUNTS = [850, 1200, 950, 1400, 1100, 780, 1600, 1250, 900, 1350, 1050, 1450, 980, 1300, 1150]

function iso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function uid(): string {
  return crypto.randomUUID()
}

function makeMess(): Mess {
  return {
    id: uid(),
    name: 'সবুজ ছায়া মেস',
    currency: '৳',
    invite_code: 'DEMO26',
    owner_id: DEMO_USER_ID,
    created_at: subMonths(new Date(), 2).toISOString(),
  }
}

function makeProfiles(): Profile[] {
  return [
    { id: DEMO_USER_ID, full_name: 'রাহিম উদ্দিন', email: 'rahim@example.com' },
    { id: 'demo-user-karim', full_name: 'করিম হোসেন', email: 'karim@example.com' },
    { id: 'demo-user-nasir', full_name: 'নাসির আহমেদ', email: 'nasir@example.com' },
    { id: 'demo-user-sajib', full_name: 'সজীব ইসলাম', email: 'sajib@example.com' },
  ]
}

function seedMonth(db: DemoDb, monthDate: Date, throughDay: number) {
  const start = startOfMonth(monthDate)
  const last = endOfMonth(monthDate).getDate()
  const days = Math.min(throughDay, last)
  const profiles = db.profiles
  const messId = db.mess.id

  for (let day = 1; day <= days; day++) {
    const date = new Date(start.getFullYear(), start.getMonth(), day)
    const dateIso = iso(date)
    profiles.forEach((profile, index) => {
      let count = 2
      if (index === 0 && day % 7 === 0) count = 0
      else if (index === 0 && day % 5 === 0) count = 1.5
      else if (index === 1 && day % 6 === 0) count = 0
      else if (index === 2 && day % 4 === 0) count = 1
      else if (index === 3 && day % 5 === 0) count = 1.5
      if (count > 0) {
        db.meals.push({
          id: uid(),
          mess_id: messId,
          user_id: profile.id,
          date: dateIso,
          count,
          note: null,
          created_by: DEMO_USER_ID,
          created_at: date.toISOString(),
        })
      }
    })

    if (day % 2 === 1) {
      const index = Math.min(Math.floor((day - 1) / 2), BAZAR_AMOUNTS.length - 1)
      db.expenses.push({
        id: uid(),
        mess_id: messId,
        date: dateIso,
        amount: BAZAR_AMOUNTS[index],
        kind: 'bazar',
        category: 'bazar',
        description: BUYERS[index % BUYERS.length],
        include_in_meal_rate: true,
        paid_by: profiles[index % profiles.length].id,
        created_by: DEMO_USER_ID,
        created_at: date.toISOString(),
      })
    }
  }

  if (days >= 1) {
    const dateIso = iso(start)
    const other = [
      { category: 'rent', description: 'বাড়ি ভাড়া', amount: 8000 },
      { category: 'wifi', description: 'ওয়াইফাই বিল', amount: 500 },
      { category: 'gas', description: 'গ্যাস বিল', amount: 450 },
      { category: 'electricity', description: 'বিদ্যুৎ বিল', amount: 1200 },
      { category: 'water', description: 'পানি বিল', amount: 300 },
      { category: 'service', description: 'মেস সার্ভিস', amount: 500 },
    ]
    for (const [itemIndex, item] of other.entries()) {
      db.expenses.push({
        id: uid(),
        mess_id: messId,
        date: dateIso,
        amount: item.amount,
        kind: 'other',
        category: item.category,
        description: item.description,
        include_in_meal_rate: false,
        paid_by: profiles[itemIndex % profiles.length].id,
        created_by: DEMO_USER_ID,
        created_at: start.toISOString(),
      })
    }
  }

  const depositPlan: { index: number; day: number; amount: number; note: string }[] = [
    { index: 0, day: 1, amount: 7000, note: 'মাসের শুরুতে জমা' },
    { index: 1, day: 1, amount: 6000, note: 'মাসের শুরুতে জমা' },
    { index: 2, day: 1, amount: 8000, note: 'মাসের শুরুতে জমা' },
    { index: 3, day: 1, amount: 6500, note: 'মাসের শুরুতে জমা' },
    { index: 0, day: 10, amount: 1000, note: 'বাজার খরচের জন্য' },
    { index: 2, day: 15, amount: 1500, note: 'অতিরিক্ত জমা' },
    { index: 1, day: 18, amount: 500, note: 'বাকি জমা' },
  ]

  for (const plan of depositPlan) {
    if (plan.day > days) continue
    const profile = profiles[plan.index]
    const date = new Date(start.getFullYear(), start.getMonth(), plan.day)
    db.deposits.push({
      id: uid(),
      mess_id: messId,
      user_id: profile.id,
      date: iso(date),
      amount: plan.amount,
      note: plan.note,
      created_by: DEMO_USER_ID,
      created_at: date.toISOString(),
    })
  }
}

function seedDb(): DemoDb {
  const now = new Date()
  const db: DemoDb = {
    profiles: makeProfiles(),
    mess: makeMess(),
    members: makeProfiles().map((profile, index) => ({
      user_id: profile.id,
      role: index === 0 ? 'manager' : 'member',
      joined_at: subMonths(now, 2).toISOString(),
      left_at: null,
    })),
    meals: [],
    expenses: [],
    deposits: [],
  }
  const previous = subMonths(now, 1)
  seedMonth(db, previous, endOfMonth(previous).getDate())
  seedMonth(db, now, now.getDate())
  return db
}

function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb
      if (parsed?.mess?.id && Array.isArray(parsed.meals)) {
        parsed.expenses = (parsed.expenses ?? []).map((expense) => ({
          ...expense,
          paid_by: expense.paid_by ?? expense.created_by ?? null,
        }))
        return parsed
      }
    }
  } catch {
    // fall through to seed
  }
  const db = seedDb()
  writeDb(db)
  return db
}

function writeDb(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function demoSession(): SessionUser {
  return { id: DEMO_USER_ID, email: 'rahim@example.com', name: 'রাহিম উদ্দিন' }
}

export function createDemoApi(): Api {
  let db = readDb()
  const listeners = new Set<() => void>()

  function notify() {
    listeners.forEach((listener) => listener())
  }

  function persist() {
    writeDb(db)
    notify()
  }

  function memberFor(userId: string): Member {
    const membership = db.members.find((item) => item.user_id === userId)
    const profile = db.profiles.find((item) => item.id === userId) ?? {
      id: userId,
      full_name: 'সদস্য',
      email: null,
    }
    return {
      user_id: userId,
      role: membership?.role ?? 'member',
      joined_at: membership?.joined_at ?? new Date().toISOString(),
      left_at: membership?.left_at ?? null,
      profile,
    }
  }

  return {
    mode: 'demo',

    async getSession() {
      return demoSession()
    },

    onAuthChange(callback) {
      callback(demoSession())
      return () => undefined
    },

    async signIn() {
      return undefined
    },

    async signUp(): Promise<SignUpResult> {
      return { needsConfirmation: false }
    },

    async signOut() {
      return undefined
    },

    async listMemberships(): Promise<Membership[]> {
      db = readDb()
      const me = db.members.find((member) => member.user_id === DEMO_USER_ID) ?? db.members[0]
      return [
        {
          mess: db.mess,
          role: me?.role ?? 'manager',
          joined_at: me?.joined_at ?? '',
          left_at: me?.left_at ?? null,
        },
      ]
    },

    async createMess(): Promise<Mess> {
      throw new Error('ডেমো মোডে নতুন মেস তৈরি করা যায় না। Cloud চালু করে সেটা করুন।')
    },

    async joinMess(): Promise<Mess> {
      throw new Error('ডেমো মোডে নতুন মেসে join করা যায় না। Cloud চালু করে সেটা করুন।')
    },

    async updateMess(messId, patch) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      db.mess = { ...db.mess, ...patch }
      persist()
    },

    async leaveMess() {
      throw new Error('ম্যানেজার মেস ছাড়তে পারবেন না।')
    },

    async regenerateInvite(messId) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      db.mess = { ...db.mess, invite_code: code }
      persist()
      return code
    },

    async listMembers(messId) {
      if (db.mess.id !== messId) return []
      return db.members.map((membership) => memberFor(membership.user_id))
    },

    async removeMember(messId, targetUserId) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      const membership = db.members.find((item) => item.user_id === targetUserId)
      if (!membership) throw new Error('সদস্য পাওয়া যায়নি।')
      if (membership.role === 'manager') throw new Error('ম্যানেজারকে সরানো যায় না।')
      membership.left_at = iso(new Date())
      persist()
    },

    async transferManager(messId, newManagerUserId) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      const members = db.members
      const currentManager = members.find((m) => m.role === 'manager')
      if (!currentManager) throw new Error('এই মেসে কোনো ম্যানেজার নেই।')
      const newManager = members.find((m) => m.user_id === newManagerUserId)
      if (!newManager || newManager.role === 'manager') throw new Error('নতুন ম্যানেজার এই মেসের সক্রিয় সদস্য নন।')
      currentManager.role = 'member'
      newManager.role = 'manager'
      db.mess = { ...db.mess, owner_id: newManagerUserId }
      persist()
    },

    async loadMonth(messId, start, end): Promise<MonthData> {
      if (db.mess.id !== messId) return { meals: [], expenses: [], deposits: [] }
      return {
        meals: db.meals.filter((meal) => meal.date >= start && meal.date <= end),
        expenses: db.expenses.filter((expense) => expense.date >= start && expense.date <= end),
        deposits: db.deposits.filter((deposit) => deposit.date >= start && deposit.date <= end),
      }
    },

    async saveMeals(messId, date, entries: MealEntry[]) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      for (const entry of entries) {
        const index = db.meals.findIndex(
          (meal) => meal.mess_id === messId && meal.user_id === entry.userId && meal.date === date,
        )
        if (Number(entry.count) <= 0) {
          if (index >= 0) db.meals.splice(index, 1)
          continue
        }
        if (index >= 0) {
          db.meals[index] = { ...db.meals[index], count: Number(entry.count) }
        } else {
          db.meals.push({
            id: uid(),
            mess_id: messId,
            user_id: entry.userId,
            date,
            count: Number(entry.count),
            note: null,
            created_by: DEMO_USER_ID,
            created_at: new Date().toISOString(),
          })
        }
      }
      persist()
    },

    async addExpense(messId, input: ExpenseInput) {
      db.expenses.push({
        id: uid(),
        mess_id: messId,
        date: input.date,
        amount: Number(input.amount),
        kind: input.kind,
        category: input.category,
        description: input.description.trim(),
        include_in_meal_rate: input.include_in_meal_rate,
        paid_by: input.paid_by || DEMO_USER_ID,
        created_by: DEMO_USER_ID,
        created_at: new Date().toISOString(),
      })
      persist()
    },

    async updateExpense(id, messId, input) {
      const expense = db.expenses.find((item) => item.id === id && item.mess_id === messId)
      if (!expense) throw new Error('খরচ পাওয়া যায়নি।')
      Object.assign(expense, {
        date: input.date,
        amount: Number(input.amount),
        kind: input.kind,
        category: input.category,
        description: input.description.trim(),
        include_in_meal_rate: input.include_in_meal_rate,
        paid_by: input.paid_by || expense.paid_by || DEMO_USER_ID,
      })
      persist()
    },

    async deleteExpense(id, messId) {
      db.expenses = db.expenses.filter((item) => !(item.id === id && item.mess_id === messId))
      persist()
    },

    async addDeposit(messId, input: DepositInput) {
      db.deposits.push({
        id: uid(),
        mess_id: messId,
        user_id: input.user_id,
        date: input.date,
        amount: Number(input.amount),
        note: input.note.trim() || null,
        created_by: DEMO_USER_ID,
        created_at: new Date().toISOString(),
      })
      persist()
    },

    async updateDeposit(id, messId, input) {
      const deposit = db.deposits.find((item) => item.id === id && item.mess_id === messId)
      if (!deposit) throw new Error('জমা পাওয়া যায়নি।')
      Object.assign(deposit, {
        user_id: input.user_id,
        date: input.date,
        amount: Number(input.amount),
        note: input.note.trim() || null,
      })
      persist()
    },

    async deleteDeposit(id, messId) {
      db.deposits = db.deposits.filter((item) => !(item.id === id && item.mess_id === messId))
      persist()
    },

    subscribe(_messId, onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },

    getInitialMonth() {
      const now = new Date()
      if (now.getDate() < 10) return startOfMonth(subMonths(now, 1))
      return startOfMonth(now)
    },

    async resetDemo() {
      db = seedDb()
      persist()
    },
  }
}

export function demoMonthOptions(): Date[] {
  const now = new Date()
  return [startOfMonth(now), startOfMonth(addMonths(now, -1)), startOfMonth(addMonths(now, -2))]
}
