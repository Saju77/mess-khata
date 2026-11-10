import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns'
import type { Api, SignUpResult } from './api'
import type {
  ActivityAction,
  ActivityEntity,
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
  Profile,
  SessionUser,
} from './types'
import { calculateOpeningBalances } from './calc'
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
  activity: ActivityLogEntry[]
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

function seedActivity(db: DemoDb) {
  const now = new Date()
  const recent: { entity: 'expense' | 'deposit'; row: Expense | Deposit }[] = [
    ...db.expenses.map((row) => ({ entity: 'expense' as const, row })),
    ...db.deposits.map((row) => ({ entity: 'deposit' as const, row })),
  ]
  recent.sort(
    (a, b) => b.row.date.localeCompare(a.row.date) || b.row.created_at.localeCompare(a.row.created_at),
  )

  const logs: ActivityLogEntry[] = []
  for (const [index, item] of recent.slice(0, 16).entries()) {
    const actorId =
      item.entity === 'expense'
        ? ((item.row as Expense).paid_by ?? (item.row as Expense).created_by)
        : (item.row as Deposit).user_id
    const actor = db.profiles.find((profile) => profile.id === actorId)
    logs.push({
      id: uid(),
      mess_id: db.mess.id,
      actor_id: actorId,
      actor_name: actor?.full_name || 'সিস্টেম',
      action: 'insert',
      entity: item.entity,
      entity_id: item.row.id,
      data: { ...item.row } as unknown as Record<string, unknown>,
      old_data: null,
      created_at: new Date(now.getTime() - index * 37 * 60 * 1000).toISOString(),
    })
  }

  // ডেমোতে একটা এডিটের উদাহরণ, যাতে ম্যানেজার কীভাবে বদল হয়েছে দেখতে পান
  const latestExpense = recent.find((item) => item.entity === 'expense')?.row as Expense | undefined
  if (latestExpense) {
    logs.push({
      id: uid(),
      mess_id: db.mess.id,
      actor_id: latestExpense.paid_by ?? DEMO_USER_ID,
      actor_name:
        db.profiles.find((profile) => profile.id === (latestExpense.paid_by ?? DEMO_USER_ID))?.full_name ||
        'সিস্টেম',
      action: 'update',
      entity: 'expense',
      entity_id: latestExpense.id,
      data: { ...latestExpense } as unknown as Record<string, unknown>,
      old_data: {
        ...latestExpense,
        amount: Math.max(1, latestExpense.amount - 250),
      } as unknown as Record<string, unknown>,
      created_at: new Date(now.getTime() - 8 * 60 * 1000).toISOString(),
    })
  }

  // ডেমোতে একটা ডিলিটের উদাহরণ
  const sampleMember = db.profiles[2]
  if (sampleMember) {
    const deleted: Deposit = {
      id: uid(),
      mess_id: db.mess.id,
      user_id: sampleMember.id,
      date: iso(now),
      amount: 500,
      note: 'ভুল করে দেওয়া এন্ট্রি (ডেমো)',
      created_by: DEMO_USER_ID,
      created_at: now.toISOString(),
    }
    logs.push({
      id: uid(),
      mess_id: db.mess.id,
      actor_id: DEMO_USER_ID,
      actor_name: db.profiles[0]?.full_name || 'সিস্টেম',
      action: 'delete',
      entity: 'deposit',
      entity_id: deleted.id,
      data: null,
      old_data: { ...deleted } as unknown as Record<string, unknown>,
      created_at: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
    })
  }

  db.activity = logs.sort((a, b) => b.created_at.localeCompare(a.created_at))
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
    activity: [],
  }
  const previous = subMonths(now, 1)
  seedMonth(db, previous, endOfMonth(previous).getDate())
  seedMonth(db, now, now.getDate())
  seedActivity(db)
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
        if (!Array.isArray(parsed.activity)) {
          seedActivity(parsed)
          writeDb(parsed)
        }
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

  function requireManager(messId: string) {
    db = readDb()
    const me = db.members.find((member) => member.user_id === DEMO_USER_ID)
    if (db.mess.id !== messId || me?.role !== 'manager' || me.left_at) {
      throw new Error('not manager')
    }
  }

  function logActivity(draft: {
    action: ActivityAction
    entity: ActivityEntity
    entity_id: string
    data?: Record<string, unknown> | null
    old_data?: Record<string, unknown> | null
    actor_id?: string | null
  }) {
    const actorId = draft.actor_id === undefined ? DEMO_USER_ID : draft.actor_id
    const actor = db.profiles.find((profile) => profile.id === actorId)
    db.activity.unshift({
      id: uid(),
      mess_id: db.mess.id,
      actor_id: actorId,
      actor_name: actor?.full_name || 'সিস্টেম',
      action: draft.action,
      entity: draft.entity,
      entity_id: draft.entity_id,
      data: draft.data ?? null,
      old_data: draft.old_data ?? null,
      created_at: new Date().toISOString(),
    })
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

    async requestPasswordReset(): Promise<void> {
      throw new Error('ডেমো মোডে পাসওয়ার্ড রিসেট ইমেইল পাঠানো যায় না। Cloud মোডে লগইন করে ব্যবহার করুন।')
    },

    async updatePassword(): Promise<void> {
      throw new Error('ডেমো মোডে পাসওয়ার্ড বদলানো যায় না। Cloud মোডে লগইন করে ব্যবহার করুন।')
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
      const before = { ...membership }
      membership.left_at = iso(new Date())
      logActivity({
        action: 'update',
        entity: 'member',
        entity_id: targetUserId,
        data: { ...membership } as unknown as Record<string, unknown>,
        old_data: before as unknown as Record<string, unknown>,
      })
      persist()
    },

    async updateMemberJoinDate(messId, userId, joinedAt) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      const membership = db.members.find((item) => item.user_id === userId)
      if (!membership) throw new Error('সদস্য পাওয়া যায়নি।')
      const before = { ...membership }
      membership.joined_at = `${joinedAt}T00:00:00.000Z`
      logActivity({
        action: 'update',
        entity: 'member',
        entity_id: userId,
        data: { ...membership } as unknown as Record<string, unknown>,
        old_data: before as unknown as Record<string, unknown>,
      })
      persist()
    },

    async transferManager(messId, newManagerUserId) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      const members = db.members
      const currentManager = members.find((m) => m.role === 'manager')
      if (!currentManager) throw new Error('এই মেসে কোনো ম্যানেজার নেই।')
      const newManager = members.find((m) => m.user_id === newManagerUserId)
      if (!newManager || newManager.role === 'manager') throw new Error('নতুন ম্যানেজার এই মেসের সক্রিয় সদস্য নন।')
      const oldRole = { ...currentManager }
      const newRole = { ...newManager }
      currentManager.role = 'member'
      newManager.role = 'manager'
      db.mess = { ...db.mess, owner_id: newManagerUserId }
      logActivity({
        action: 'update',
        entity: 'member',
        entity_id: currentManager.user_id,
        data: { ...currentManager } as unknown as Record<string, unknown>,
        old_data: oldRole as unknown as Record<string, unknown>,
      })
      logActivity({
        action: 'update',
        entity: 'member',
        entity_id: newManager.user_id,
        data: { ...newManager } as unknown as Record<string, unknown>,
        old_data: newRole as unknown as Record<string, unknown>,
      })
      persist()
    },

    async loadMonth(messId, start, end): Promise<MonthData> {
      if (db.mess.id !== messId) {
        return { meals: [], expenses: [], deposits: [], openingBalances: {} }
      }
      const members = db.members.map((membership) => memberFor(membership.user_id))
      const openingBalances = calculateOpeningBalances(
        members,
        db.meals,
        db.expenses,
        db.deposits,
        start,
      )
      return {
        meals: db.meals.filter((meal) => meal.date >= start && meal.date <= end),
        expenses: db.expenses.filter((expense) => expense.date >= start && expense.date <= end),
        deposits: db.deposits.filter((deposit) => deposit.date >= start && deposit.date <= end),
        openingBalances,
      }
    },

    async saveMeals(messId, date, entries: MealEntry[]) {
      if (db.mess.id !== messId) throw new Error('মেস পাওয়া যায়নি।')
      for (const entry of entries) {
        const index = db.meals.findIndex(
          (meal) => meal.mess_id === messId && meal.user_id === entry.userId && meal.date === date,
        )
        if (Number(entry.count) <= 0) {
          if (index >= 0) {
            const [removed] = db.meals.splice(index, 1)
            if (removed) {
              logActivity({
                action: 'delete',
                entity: 'meal',
                entity_id: removed.id,
                old_data: { ...removed } as unknown as Record<string, unknown>,
              })
            }
          }
          continue
        }
        if (index >= 0) {
          const previous = db.meals[index]
          if (Number(previous.count) !== Number(entry.count)) {
            const next = { ...previous, count: Number(entry.count) }
            db.meals[index] = next
            logActivity({
              action: 'update',
              entity: 'meal',
              entity_id: next.id,
              data: { ...next } as unknown as Record<string, unknown>,
              old_data: { ...previous } as unknown as Record<string, unknown>,
            })
          }
        } else {
          const created: Meal = {
            id: uid(),
            mess_id: messId,
            user_id: entry.userId,
            date,
            count: Number(entry.count),
            note: null,
            created_by: DEMO_USER_ID,
            created_at: new Date().toISOString(),
          }
          db.meals.push(created)
          logActivity({
            action: 'insert',
            entity: 'meal',
            entity_id: created.id,
            data: { ...created } as unknown as Record<string, unknown>,
          })
        }
      }
      persist()
    },

    async addExpense(messId, input: ExpenseInput) {
      const created: Expense = {
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
      }
      db.expenses.push(created)
      logActivity({
        action: 'insert',
        entity: 'expense',
        entity_id: created.id,
        data: { ...created } as unknown as Record<string, unknown>,
      })
      persist()
    },

    async updateExpense(id, messId, input) {
      const expense = db.expenses.find((item) => item.id === id && item.mess_id === messId)
      if (!expense) throw new Error('খরচ পাওয়া যায়নি।')
      const before = { ...expense }
      Object.assign(expense, {
        date: input.date,
        amount: Number(input.amount),
        kind: input.kind,
        category: input.category,
        description: input.description.trim(),
        include_in_meal_rate: input.include_in_meal_rate,
        paid_by: input.paid_by || expense.paid_by || DEMO_USER_ID,
      })
      logActivity({
        action: 'update',
        entity: 'expense',
        entity_id: expense.id,
        data: { ...expense } as unknown as Record<string, unknown>,
        old_data: before as unknown as Record<string, unknown>,
      })
      persist()
    },

    async deleteExpense(id, messId) {
      const removed = db.expenses.find((item) => item.id === id && item.mess_id === messId)
      db.expenses = db.expenses.filter((item) => !(item.id === id && item.mess_id === messId))
      if (removed) {
        logActivity({
          action: 'delete',
          entity: 'expense',
          entity_id: removed.id,
          old_data: { ...removed } as unknown as Record<string, unknown>,
        })
      }
      persist()
    },

    async addDeposit(messId, input: DepositInput) {
      requireManager(messId)
      const created: Deposit = {
        id: uid(),
        mess_id: messId,
        user_id: input.user_id,
        date: input.date,
        amount: Number(input.amount),
        note: input.note.trim() || null,
        created_by: DEMO_USER_ID,
        created_at: new Date().toISOString(),
      }
      db.deposits.push(created)
      logActivity({
        action: 'insert',
        entity: 'deposit',
        entity_id: created.id,
        data: { ...created } as unknown as Record<string, unknown>,
      })
      persist()
    },

    async updateDeposit(id, messId, input) {
      requireManager(messId)
      const deposit = db.deposits.find((item) => item.id === id && item.mess_id === messId)
      if (!deposit) throw new Error('জমা পাওয়া যায়নি।')
      const before = { ...deposit }
      Object.assign(deposit, {
        user_id: input.user_id,
        date: input.date,
        amount: Number(input.amount),
        note: input.note.trim() || null,
      })
      logActivity({
        action: 'update',
        entity: 'deposit',
        entity_id: deposit.id,
        data: { ...deposit } as unknown as Record<string, unknown>,
        old_data: before as unknown as Record<string, unknown>,
      })
      persist()
    },

    async deleteDeposit(id, messId) {
      requireManager(messId)
      const removed = db.deposits.find((item) => item.id === id && item.mess_id === messId)
      db.deposits = db.deposits.filter((item) => !(item.id === id && item.mess_id === messId))
      if (removed) {
        logActivity({
          action: 'delete',
          entity: 'deposit',
          entity_id: removed.id,
          old_data: { ...removed } as unknown as Record<string, unknown>,
        })
      }
      persist()
    },

    async listActivity(messId, limit = 100, offset = 0) {
      db = readDb()
      if (db.mess.id !== messId) return []
      const me = db.members.find((member) => member.user_id === DEMO_USER_ID)
      if (me?.role !== 'manager' || me.left_at) {
        throw new Error('শুধু ম্যানেজার অ্যাক্টিভিটি ইতিহাস দেখতে পারবেন।')
      }
      return [...db.activity]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(offset, offset + limit)
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
