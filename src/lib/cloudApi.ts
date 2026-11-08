import { startOfMonth } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Api, SignUpResult } from './api'
import type { SupabaseConfig } from './config'
import { createSupabaseClient } from './supabase'
import type {
  ActivityLogEntry,
  Deposit,
  Expense,
  ExpenseInput,
  Meal,
  Member,
  Membership,
  Mess,
  SessionUser,
} from './types'

type Row = Record<string, any>

function mapSession(session: { user?: { id: string; email?: string | null; user_metadata?: Row } } | null): SessionUser | null {
  if (!session?.user) return null
  const user = session.user
  return {
    id: user.id,
    email: user.email ?? '',
    name:
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split('@')[0] ||
      'সদস্য',
  }
}

function normalizeMess(row: Row): Mess {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency || '৳',
    invite_code: row.invite_code,
    owner_id: row.owner_id,
    created_at: row.created_at,
  }
}

function normalizeMember(row: Row): Member {
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
  return {
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    left_at: row.left_at,
    profile: {
      id: profile?.id ?? row.user_id,
      full_name: profile?.full_name ?? 'সদস্য',
      email: profile?.email ?? null,
    },
  }
}

function normalizeMeal(row: Row): Meal {
  return { ...row, count: Number(row.count ?? 0) } as Meal
}

function normalizeExpense(row: Row): Expense {
  return { ...row, amount: Number(row.amount ?? 0) } as Expense
}

function normalizeDeposit(row: Row): Deposit {
  return { ...row, amount: Number(row.amount ?? 0) } as Deposit
}

function normalizeActivity(row: Row): ActivityLogEntry {
  return {
    id: row.id,
    mess_id: row.mess_id,
    actor_id: row.actor_id ?? null,
    actor_name: row.actor_name || 'সিস্টেম',
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id ?? '',
    data: row.data ?? null,
    old_data: row.old_data ?? null,
    created_at: row.created_at,
  }
}

export function createCloudApi(config: SupabaseConfig): Api {
  const client: SupabaseClient = createSupabaseClient(config)

  async function userId(): Promise<string> {
    const { data, error } = await client.auth.getSession()
    if (error) throw new Error(error.message)
    if (!data.session?.user) throw new Error('not authenticated')
    return data.session.user.id
  }

  return {
    mode: 'cloud',

    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw new Error(error.message)
      return mapSession(data.session)
    },

    onAuthChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(mapSession(session))
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(error.message)
    },

    async signUp(name, email, password): Promise<SignUpResult> {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      })
      if (error) throw new Error(error.message)
      return { needsConfirmation: !data.session }
    },

    async requestPasswordReset(email) {
      const trimmed = email.trim()
      const { error } = await client.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password?email=${encodeURIComponent(trimmed)}`,
      })
      if (error) throw new Error(error.message)
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw new Error(error.message)
    },

    async listMemberships(): Promise<Membership[]> {
      const uid = await userId()
      const { data, error } = await client
        .from('mess_members')
        .select('mess_id, mess:messes!mess_members_mess_id_fkey(id, name, currency, invite_code, owner_id, created_at), role, joined_at, left_at')
        .eq('user_id', uid)
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        mess: normalizeMess(row.mess),
        role: row.role,
        joined_at: row.joined_at,
        left_at: row.left_at,
      }))
    },

    async createMess(name) {
      await userId()
      const { data, error } = await client.rpc('create_mess', { p_name: name })
      if (error) throw new Error(error.message)
      return normalizeMess(data)
    },

    async joinMess(code) {
      const { data, error } = await client.rpc('join_mess', { p_code: code })
      if (error) throw new Error(error.message)
      return normalizeMess(data)
    },

    async updateMess(messId, patch) {
      const { error } = await client.from('messes').update(patch).eq('id', messId)
      if (error) throw new Error(error.message)
    },

    async leaveMess(messId) {
      const { error } = await client.rpc('leave_mess', { p_mess: messId })
      if (error) throw new Error(error.message)
    },

    async regenerateInvite(messId) {
      const { data, error } = await client.rpc('regenerate_invite', { p_mess: messId })
      if (error) throw new Error(error.message)
      return data
    },

    async listMembers(messId) {
      const { data, error } = await client
        .from('mess_members')
        .select('user_id, role, joined_at, left_at, profile:profiles!mess_members_user_id_fkey(id, full_name, email)')
        .eq('mess_id', messId)
      if (error) throw new Error(error.message)
      return data.map((row) => normalizeMember(row))
    },

    async removeMember(messId, userId) {
      const { error } = await client.rpc('remove_member', { p_mess: messId, p_user: userId })
      if (error) throw new Error(error.message)
    },

    async transferManager(messId, newManagerUserId): Promise<void> {
      const { error } = await client.rpc('transfer_mess_manager', {
        p_mess: messId,
        p_new_manager: newManagerUserId,
      })
      if (error) throw new Error(error.message)
    },

    async loadMonth(messId, start, end) {
      const { data: meals, error: mealsError } = await client
        .from('meals')
        .select('*')
        .eq('mess_id', messId)
        .gte('date', start)
        .lte('date', end)
      if (mealsError) throw new Error(mealsError.message)

      const { data: expenses, error: expensesError } = await client
        .from('expenses')
        .select('*')
        .eq('mess_id', messId)
        .gte('date', start)
        .lte('date', end)
      if (expensesError) throw new Error(expensesError.message)

      const { data: deposits, error: depositsError } = await client
        .from('deposits')
        .select('*')
        .eq('mess_id', messId)
        .gte('date', start)
        .lte('date', end)
      if (depositsError) throw new Error(depositsError.message)

      return {
        meals: (meals ?? []).map(normalizeMeal),
        expenses: (expenses ?? []).map(normalizeExpense),
        deposits: (deposits ?? []).map(normalizeDeposit),
      }
    },

    async saveMeals(messId, date, entries) {
      const uid = await userId()
      const mealRows = entries.map((entry) => ({
        mess_id: messId,
        user_id: entry.userId,
        date,
        count: Number(entry.count) || 0,
        created_by: uid,
      }))
      if (mealRows.length === 0) return
      const { error } = await client
        .from('meals')
        .upsert(mealRows, { onConflict: 'mess_id,user_id,date' })
      if (error) throw new Error(error.message)
    },

    async addExpense(messId, input: ExpenseInput) {
      const uid = await userId()
      const { error } = await client.from('expenses').insert({
        mess_id: messId,
        ...input,
        amount: Number(input.amount),
        paid_by: input.paid_by || uid,
        created_by: uid,
      })
      if (error) throw new Error(error.message)
    },

    async updateExpense(id, messId, input) {
      const { error } = await client
        .from('expenses')
        .update({ ...input, amount: Number(input.amount), paid_by: input.paid_by || null })
        .eq('id', id)
        .eq('mess_id', messId)
      if (error) throw new Error(error.message)
    },

    async deleteExpense(id, messId) {
      const { error } = await client.from('expenses').delete().eq('id', id).eq('mess_id', messId)
      if (error) throw new Error(error.message)
    },

    async addDeposit(messId, input) {
      const uid = await userId()
      const { error } = await client.from('deposits').insert({
        mess_id: messId,
        user_id: input.user_id,
        date: input.date,
        amount: Number(input.amount),
        note: input.note,
        created_by: uid,
      })
      if (error) throw new Error(error.message)
    },

    async updateDeposit(id, messId, input) {
      const { error } = await client
        .from('deposits')
        .update({
          user_id: input.user_id,
          date: input.date,
          amount: Number(input.amount),
          note: input.note,
        })
        .eq('id', id)
        .eq('mess_id', messId)
      if (error) throw new Error(error.message)
    },

    async deleteDeposit(id, messId) {
      const { error } = await client.from('deposits').delete().eq('id', id).eq('mess_id', messId)
      if (error) throw new Error(error.message)
    },

    async listActivity(messId, limit = 100, offset = 0) {
      const { data, error } = await client
        .from('activity_log')
        .select(
          'id, mess_id, actor_id, actor_name, action, entity, entity_id, data, old_data, created_at',
        )
        .eq('mess_id', messId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) throw new Error(error.message)
      return (data ?? []).map(normalizeActivity)
    },

    subscribe(messId, onChange) {
      const channel = client
        .channel(`mess:${messId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meals', filter: `mess_id=eq.${messId}` },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses', filter: `mess_id=eq.${messId}` },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'deposits', filter: `mess_id=eq.${messId}` },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mess_members', filter: `mess_id=eq.${messId}` },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activity_log', filter: `mess_id=eq.${messId}` },
          onChange,
        )
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },

    getInitialMonth() {
      return startOfMonth(new Date())
    },
  }
}
