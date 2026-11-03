import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Calculator,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShoppingBasket,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { Avatar, Badge, Button, ConfirmDialog, Modal, cn } from './ui'

const NAV = [
  { to: '/', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, end: true },
  { to: '/meals', label: 'মিল', icon: UtensilsCrossed },
  { to: '/bazar', label: 'বাজার', icon: ShoppingBasket },
  { to: '/deposits', label: 'জমা', icon: Wallet },
  { to: '/other', label: 'অন্যান্য খরচ', icon: ReceiptText },
  { to: '/members', label: 'সদস্য', icon: Users },
  { to: '/summary', label: 'সারসংক্ষেপ', icon: Calculator },
  { to: '/activity', label: 'অ্যাক্টিভিটি', icon: History },
  { to: '/settings', label: 'সেটিংস', icon: Settings },
]

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[6]]

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-900/20">
        <UtensilsCrossed className="h-5 w-5" aria-hidden />
      </span>
      <div className="leading-none">
        <p className={cn('text-base font-bold tracking-tight', dark ? 'text-white' : 'text-slate-900')}>মেস খাতা</p>
        <p className={cn('mt-1 text-[10px] font-medium tracking-wide', dark ? 'text-teal-200/70' : 'text-slate-400')}>
          MESS KHATA
        </p>
      </div>
    </div>
  )
}

function MessSwitcher({ dark = false }: { dark?: boolean }) {
  const { activeMess, memberships, switchMess } = useApp()
  if (!activeMess) return null
  if (memberships.length <= 1) {
    return (
      <div
        className={cn(
          'rounded-xl border px-3 py-2.5',
          dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50',
        )}
      >
        <p className={cn('truncate text-sm font-semibold', dark ? 'text-white' : 'text-slate-800')}>
          {activeMess.mess.name}
        </p>
        <p className={cn('mt-0.5 text-[11px]', dark ? 'text-teal-200/60' : 'text-slate-500')}>
          {activeMess.role === 'manager' ? 'ম্যানেজার' : 'সদস্য'} · {activeMess.mess.invite_code}
        </p>
      </div>
    )
  }
  return (
    <div className="relative">
      <select
        value={activeMess.mess.id}
        onChange={(event) => switchMess(event.target.value)}
        className={cn(
          'w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm font-semibold outline-none',
          dark
            ? 'border-white/10 bg-white/5 text-white'
            : 'border-slate-200 bg-slate-50 text-slate-800',
        )}
      >
        {memberships.map((item) => (
          <option key={item.mess.id} value={item.mess.id} className="text-slate-900">
            {item.mess.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn('pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2', dark ? 'text-teal-200/70' : 'text-slate-400')}
        aria-hidden
      />
    </div>
  )
}

function NavLinks({ onNavigate, dark = false }: { onNavigate?: () => void; dark?: boolean }) {
  const { activeMess } = useApp()
  const items =
    activeMess?.role === 'manager' ? NAV : NAV.filter((item) => item.to !== '/activity')
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              dark
                ? isActive
                  ? 'bg-white/10 text-white'
                  : 'text-teal-100/70 hover:bg-white/5 hover:text-white'
                : isActive
                  ? 'bg-teal-50 text-teal-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { activeMess, user, mode, signOut, resetDemo, error, setError } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  if (!activeMess || !user) return null

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const handleResetDemo = async () => {
    setResetting(true)
    try {
      await resetDemo()
      toast.success('ডেমো ডেটা রিসেট হয়েছে।')
      setResetOpen(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResetting(false)
    }
  }

  const handleCreateMess = async () => {
    setMenuOpen(false)
    navigate('/settings')
  }

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0c2f2a] px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo dark />
        </div>
        <div className="mt-6">
          <MessSwitcher dark />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto scroll-thin">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-200/40">মেনু</p>
          <NavLinks dark />
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-teal-200/60">{activeMess.role === 'manager' ? 'ম্যানেজার' : 'সদস্য'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-teal-200/60 transition hover:bg-white/10 hover:text-white"
              aria-label="লগ আউট"
              title="লগ আউট"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[11px] text-teal-200/60">
            <span className={cn('h-1.5 w-1.5 rounded-full', mode === 'demo' ? 'bg-amber-400' : 'bg-emerald-400')} />
            {mode === 'demo' ? 'ডেমো মোড' : 'ক্লাউড সিঙ্ক চালু'}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-20 border-b border-slate-200/70 bg-[#f6f7f4]/90 backdrop-blur-lg lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
                aria-label="মেনু খুলুন"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 px-4 py-2">
            <p className="truncate text-sm font-semibold text-slate-800">{activeMess.mess.name}</p>
            <Badge tone={mode === 'demo' ? 'amber' : 'emerald'}>{mode === 'demo' ? 'ডেমো' : 'সিঙ্ক'}</Badge>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          {mode === 'demo' ? (
            <div className="no-print mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  <span className="font-semibold">ডেমো মোড</span> — ডেটা শুধু এই ব্রাউজারে থাকবে। নিজের মেস চালাতে Cloud চালু করুন।
                </p>
              </div>
              <div className="flex shrink-0 gap-2 pl-6 sm:pl-0">
                <Button size="sm" variant="dark" onClick={() => navigate('/settings')}>
                  Cloud সেটআপ
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
                  রিসেট
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="no-print mb-4">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <p className="leading-relaxed">{error}</p>
                <button type="button" onClick={() => setError(null)} className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100" aria-label="বন্ধ করুন">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <Outlet />
        </main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
                    isActive ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600',
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="মেনু" size="sm">
        <div className="space-y-5">
          <MessSwitcher />
          <NavLinks onNavigate={() => setMenuOpen(false)} />
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={handleCreateMess} icon={Settings}>
                সেটিংস
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSignOut} icon={LogOut}>
                লগ আউট
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        title="ডেমো ডেটা রিসেট করবেন?"
        description="সব ডেমো এন্ট্রি মুছে গিয়ে নতুন ডেমো ডেটা তৈরি হবে।"
        confirmLabel="রিসেট করুন"
        loading={resetting}
        onConfirm={handleResetDemo}
        onClose={() => setResetOpen(false)}
      />
    </div>
  )
}
