import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { startOfMonth } from 'date-fns'
import type { Api, SignUpResult } from '../lib/api'
import { createApi } from '../lib/api'
import type { AppMode, SupabaseConfig } from '../lib/config'
import {
  clearConfig,
  clearMode,
  hasEnvConfig,
  loadActiveMessId,
  loadConfig,
  loadMode,
  saveActiveMessId,
  saveConfig,
  saveMode,
} from '../lib/config'
import { friendlyError } from '../lib/errors'
import { monthRange } from '../lib/format'
import type {
  ActivityLogEntry,
  DepositInput,
  ExpenseInput,
  MealEntry,
  Member,
  Membership,
  MonthData,
  SessionUser,
} from '../lib/types'

interface AppContextValue {
  mode: AppMode | null
  config: SupabaseConfig | null
  api: Api | null
  user: SessionUser | null
  booting: boolean
  memberships: Membership[]
  membershipsLoading: boolean
  membershipsLoaded: boolean
  activeMess: Membership | null
  members: Member[]
  month: Date
  monthData: MonthData
  dataLoading: boolean
  error: string | null
  hasEnvConfig: boolean
  refreshTick: number

  setMonth: (date: Date) => void
  setError: (message: string | null) => void
  refresh: () => void
  switchMess: (messId: string) => void

  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  enterDemo: () => void
  connectCloud: (config: SupabaseConfig) => void
  disconnectCloud: () => void

  createMess: (name: string) => Promise<void>
  joinMess: (code: string) => Promise<void>
  updateMess: (patch: { name?: string; currency?: string }) => Promise<void>
  leaveMess: () => Promise<void>
  regenerateInvite: () => Promise<string>
  removeMember: (userId: string) => Promise<void>
  transferManager: (newManagerUserId: string) => Promise<void>

  saveMeals: (date: string, entries: MealEntry[]) => Promise<void>
  addExpense: (input: ExpenseInput) => Promise<void>
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  addDeposit: (input: DepositInput) => Promise<void>
  updateDeposit: (id: string, input: DepositInput) => Promise<void>
  deleteDeposit: (id: string) => Promise<void>
  loadActivity: (limit?: number, offset?: number) => Promise<ActivityLogEntry[]>
  resetDemo: () => Promise<void>
}

const EMPTY_MONTH: MonthData = { meals: [], expenses: [], deposits: [] }

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode | null>(() => loadMode())
  const [config, setConfig] = useState<SupabaseConfig | null>(() => loadConfig())
  const [api, setApi] = useState<Api | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [booting, setBooting] = useState(true)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [membershipsLoading, setMembershipsLoading] = useState(false)
  const [membershipsLoaded, setMembershipsLoaded] = useState(false)
  const [activeMessId, setActiveMessId] = useState<string | null>(() => loadActiveMessId())
  const [members, setMembers] = useState<Member[]>([])
  const [month, setMonthState] = useState<Date>(() => startOfMonth(new Date()))
  const [monthData, setMonthData] = useState<MonthData>(EMPTY_MONTH)
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const authUnsubRef = useRef<(() => void) | null>(null)

  const setError = useCallback((message: string | null) => setErrorState(message), [])
  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), [])
  const setMonth = useCallback((date: Date) => setMonthState(startOfMonth(date)), [])

  useEffect(() => {
    let cancelled = false
    authUnsubRef.current?.()
    authUnsubRef.current = null
    setApi(null)
    setUser(null)
    setMemberships([])
    setMembershipsLoaded(false)
    setMembers([])
    setMonthData(EMPTY_MONTH)
    setErrorState(null)
    setBooting(true)

    if (!mode) {
      setBooting(false)
      return
    }
    if (mode === 'cloud' && !config) {
      setBooting(false)
      return
    }

    ;(async () => {
      try {
        const nextApi = await createApi(mode, config)
        if (cancelled) return
        setApi(nextApi)
        setMonthState(nextApi.getInitialMonth())
        const session = await nextApi.getSession()
        if (cancelled) return
        setUser(session)
        setBooting(false)
        if (mode === 'cloud') {
          authUnsubRef.current = nextApi.onAuthChange((nextUser) => {
            if (cancelled) return
            setUser(nextUser)
            if (!nextUser) {
              setMemberships([])
              setMembershipsLoaded(false)
              setMembers([])
              setActiveMessId(null)
            }
          })
        }
      } catch (err) {
        if (!cancelled) {
          setErrorState(friendlyError(err))
          setBooting(false)
        }
      }
    })()

    return () => {
      cancelled = true
      authUnsubRef.current?.()
      authUnsubRef.current = null
    }
  }, [mode, config])

  useEffect(() => {
    if (!api || !user) {
      setMemberships([])
      setMembershipsLoading(false)
      setMembershipsLoaded(false)
      return
    }
    let cancelled = false
    setMembershipsLoading(true)
    api
      .listMemberships()
      .then((list) => {
        if (cancelled) return
        setMemberships(list)
        setMembershipsLoaded(true)
        setActiveMessId((prev) => {
          const stored = prev ?? loadActiveMessId()
          if (stored && list.some((item) => item.mess.id === stored)) return stored
          return list[0]?.mess.id ?? null
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorState(friendlyError(err))
          setMembershipsLoaded(true)
        }
      })
      .finally(() => {
        if (!cancelled) setMembershipsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, user, refreshTick])

  useEffect(() => {
    if (activeMessId) saveActiveMessId(activeMessId)
  }, [activeMessId])

  useEffect(() => {
    if (!api || !activeMessId) {
      setMembers([])
      return
    }
    let cancelled = false
    api
      .listMembers(activeMessId)
      .then((list) => {
        if (!cancelled) setMembers(list)
      })
      .catch((err) => {
        if (!cancelled) setErrorState(friendlyError(err))
      })
    return () => {
      cancelled = true
    }
  }, [api, activeMessId, refreshTick])

  const range = useMemo(() => monthRange(month), [month])

  useEffect(() => {
    if (!api || !activeMessId) {
      setMonthData(EMPTY_MONTH)
      setDataLoading(false)
      return
    }
    let cancelled = false
    setDataLoading(true)
    api
      .loadMonth(activeMessId, range.start, range.end)
      .then((data) => {
        if (!cancelled) setMonthData(data)
      })
      .catch((err) => {
        if (!cancelled) setErrorState(friendlyError(err))
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, activeMessId, range.start, range.end, refreshTick])

  useEffect(() => {
    if (!api || !activeMessId) return
    let timer: number | undefined
    const unsubscribe = api.subscribe(activeMessId, () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setRefreshTick((tick) => tick + 1), 500)
    })
    return () => {
      unsubscribe()
      if (timer) window.clearTimeout(timer)
    }
  }, [api, activeMessId])

  const activeMess = useMemo(
    () => memberships.find((item) => item.mess.id === activeMessId) ?? null,
    [memberships, activeMessId],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      await api.signIn(email, password)
    },
    [api],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      return api.signUp(name, email, password)
    },
    [api],
  )

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      await api.requestPasswordReset(email)
    },
    [api],
  )

  const updatePassword = useCallback(
    async (password: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      await api.updatePassword(password)
    },
    [api],
  )

  const signOut = useCallback(async () => {
    if (api) await api.signOut()
    if (mode === 'demo') {
      clearMode()
      setMode(null)
    }
    setUser(null)
    setMemberships([])
    setMembershipsLoaded(false)
    setActiveMessId(null)
  }, [api, mode])

  const enterDemo = useCallback(() => {
    saveMode('demo')
    setMode('demo')
  }, [])

  const connectCloud = useCallback((nextConfig: SupabaseConfig) => {
    saveConfig(nextConfig)
    saveMode('cloud')
    setConfig(nextConfig)
    setMode('cloud')
    setApi(null)
    setUser(null)
    setMemberships([])
    setMembershipsLoaded(false)
    setActiveMessId(null)
  }, [])

  const disconnectCloud = useCallback(() => {
    if (hasEnvConfig) {
      setErrorState('এই ডিপ্লয়মেন্টে Supabase env variable দিয়ে কনফিগার করা আছে, তাই এখান থেকে ডিসকানেক্ট করা যাবে না।')
      return
    }
    clearConfig()
    clearMode()
    setConfig(null)
    setMode(null)
    setApi(null)
    setUser(null)
    setMemberships([])
    setMembershipsLoaded(false)
    setActiveMessId(null)
  }, [])

  const switchMess = useCallback((messId: string) => {
    setActiveMessId(messId)
    saveActiveMessId(messId)
  }, [])

  const createMess = useCallback(
    async (name: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      const mess = await api.createMess(name)
      setActiveMessId(mess.id)
      saveActiveMessId(mess.id)
      refresh()
    },
    [api, refresh],
  )

  const joinMess = useCallback(
    async (code: string) => {
      if (!api) throw new Error('অ্যাপ এখনো প্রস্তুত নয়।')
      const mess = await api.joinMess(code)
      setActiveMessId(mess.id)
      saveActiveMessId(mess.id)
      refresh()
    },
    [api, refresh],
  )

  const updateMess = useCallback(
    async (patch: { name?: string; currency?: string }) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.updateMess(activeMessId, patch)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const leaveMess = useCallback(async () => {
    if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
    await api.leaveMess(activeMessId)
    setActiveMessId(null)
    saveActiveMessId(null)
    refresh()
  }, [api, activeMessId, refresh])

  const regenerateInvite = useCallback(async () => {
    if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
    const code = await api.regenerateInvite(activeMessId)
    refresh()
    return code
  }, [api, activeMessId, refresh])

  const removeMember = useCallback(
    async (userId: string) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.removeMember(activeMessId, userId)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const transferManager = useCallback(
    async (newManagerUserId: string) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.transferManager(activeMessId, newManagerUserId)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const saveMeals = useCallback(
    async (date: string, entries: MealEntry[]) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.saveMeals(activeMessId, date, entries)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const addExpense = useCallback(
    async (input: ExpenseInput) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.addExpense(activeMessId, input)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const updateExpense = useCallback(
    async (id: string, input: ExpenseInput) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.updateExpense(id, activeMessId, input)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.deleteExpense(id, activeMessId)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const addDeposit = useCallback(
    async (input: DepositInput) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.addDeposit(activeMessId, input)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const updateDeposit = useCallback(
    async (id: string, input: DepositInput) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.updateDeposit(id, activeMessId, input)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const deleteDeposit = useCallback(
    async (id: string) => {
      if (!api || !activeMessId) throw new Error('মেস পাওয়া যায়নি।')
      await api.deleteDeposit(id, activeMessId)
      refresh()
    },
    [api, activeMessId, refresh],
  )

  const loadActivity = useCallback(
    async (limit = 100, offset = 0) => {
      if (!api || !activeMessId) return []
      return api.listActivity(activeMessId, limit, offset)
    },
    [api, activeMessId],
  )

  const resetDemo = useCallback(async () => {
    if (!api?.resetDemo) return
    await api.resetDemo()
    setMonthState(api.getInitialMonth())
    refresh()
  }, [api, refresh])

  const value = useMemo<AppContextValue>(
    () => ({
      mode,
      config,
      api,
      user,
      booting,
      memberships,
      membershipsLoading,
      membershipsLoaded,
      activeMess,
      members,
      month,
      monthData,
      dataLoading,
      error,
      hasEnvConfig,
      refreshTick,
      setMonth,
      setError,
      refresh,
      switchMess,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      enterDemo,
      connectCloud,
      disconnectCloud,
      createMess,
      joinMess,
      updateMess,
      leaveMess,
      regenerateInvite,
      removeMember,
      transferManager,
      saveMeals,
      addExpense,
      updateExpense,
      deleteExpense,
      addDeposit,
      updateDeposit,
      deleteDeposit,
      loadActivity,
      resetDemo,
    }),
    [
      mode,
      config,
      api,
      user,
      booting,
      memberships,
      membershipsLoading,
      membershipsLoaded,
      activeMess,
      members,
      month,
      monthData,
      dataLoading,
      error,
      setMonth,
      setError,
      refresh,
      refreshTick,
      switchMess,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      enterDemo,
      connectCloud,
      disconnectCloud,
      createMess,
      joinMess,
      updateMess,
      leaveMess,
      regenerateInvite,
      removeMember,
      transferManager,
      saveMeals,
      addExpense,
      updateExpense,
      deleteExpense,
      addDeposit,
      updateDeposit,
      deleteDeposit,
      loadActivity,
      resetDemo,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}

export { hasEnvConfig }
