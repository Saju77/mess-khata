import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Cloud,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Unplug,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { testSupabaseConnection } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { validConfigShape } from '../lib/config'
import { formatDate, formatMonth } from '../lib/format'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  SectionTitle,
} from '../components/ui'

export function SettingsPage() {
  const {
    activeMess,
    memberships,
    user,
    mode,
    config,
    hasEnvConfig,
    month,
    updateMess,
    signOut,
    createMess,
    joinMess,
    switchMess,
    leaveMess,
    connectCloud,
    disconnectCloud,
    resetDemo,
  } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const isManager = activeMess?.role === 'manager'

  const [messName, setMessName] = useState(activeMess?.mess.name ?? '')
  const [messCurrency, setMessCurrency] = useState(currency)
  const [savingMess, setSavingMess] = useState(false)
  const [messError, setMessError] = useState<string | null>(null)

  useEffect(() => {
    setMessName(activeMess?.mess.name ?? '')
    setMessCurrency(activeMess?.mess.currency || '৳')
  }, [activeMess?.mess.id, activeMess?.mess.name, activeMess?.mess.currency])

  const [cloudOpen, setCloudOpen] = useState(false)
  const [cloudUrl, setCloudUrl] = useState('')
  const [cloudKey, setCloudKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [newMessName, setNewMessName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [messActionLoading, setMessActionLoading] = useState(false)
  const [messActionError, setMessActionError] = useState<string | null>(null)

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSaveMess = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessError(null)
    if (messName.trim().length < 2) {
      setMessError('মেসের নাম কমপক্ষে ২ অক্ষরের হতে হবে।')
      return
    }
    setSavingMess(true)
    try {
      await updateMess({ name: messName.trim(), currency: messCurrency.trim() || '৳' })
      toast.success('মেসের তথ্য সেভ হয়েছে।')
    } catch (err) {
      setMessError(friendlyError(err))
    } finally {
      setSavingMess(false)
    }
  }

  const handleConnectCloud = async (event: React.FormEvent) => {
    event.preventDefault()
    setCloudError(null)
    if (!validConfigShape(cloudUrl, cloudKey)) {
      setCloudError('Project URL এবং anon public key সঠিকভাবে দিন।')
      return
    }
    setConnecting(true)
    try {
      const check = await testSupabaseConnection({ url: cloudUrl, anonKey: cloudKey })
      if (!check.ok) {
        setCloudError(check.message)
        return
      }
      connectCloud({ url: cloudUrl.trim(), anonKey: cloudKey.trim() })
      setCloudOpen(false)
      toast.success('Cloud চালু হয়েছে!')
    } catch (err) {
      setCloudError(friendlyError(err))
    } finally {
      setConnecting(false)
    }
  }

  const handleCreateMess = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessActionError(null)
    if (newMessName.trim().length < 2) {
      setMessActionError('মেসের নাম লিখুন।')
      return
    }
    setMessActionLoading(true)
    try {
      await createMess(newMessName.trim())
      setCreateOpen(false)
      setNewMessName('')
      toast.success('নতুন মেস তৈরি হয়েছে।')
    } catch (err) {
      setMessActionError(friendlyError(err))
    } finally {
      setMessActionLoading(false)
    }
  }

  const handleJoinMess = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessActionError(null)
    if (joinCode.trim().length < 4) {
      setMessActionError('ইনভাইট কোড লিখুন।')
      return
    }
    setMessActionLoading(true)
    try {
      await joinMess(joinCode.trim().toUpperCase())
      setJoinOpen(false)
      setJoinCode('')
      toast.success('মেসে যোগ দিয়েছেন।')
    } catch (err) {
      setMessActionError(friendlyError(err))
    } finally {
      setMessActionLoading(false)
    }
  }

  const handleLeave = async () => {
    setLeaving(true)
    try {
      await leaveMess()
      setLeaveOpen(false)
      toast.success('মেস থেকে বের হয়েছেন।')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setLeaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const handleDisconnect = () => {
    disconnectCloud()
    setDisconnectOpen(false)
  }

  const handleResetDemo = async () => {
    setResetting(true)
    try {
      await resetDemo()
      setResetOpen(false)
      toast.success('ডেমো ডেটা রিসেট হয়েছে।')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="সেটিংস" subtitle="মেস, অ্যাকাউন্ট ও Cloud সংযোগ পরিচালনা করুন।" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <SectionTitle title="মেসের তথ্য" description="নাম ও currency পরিবর্তন করুন" />
          <form onSubmit={handleSaveMess} className="space-y-4">
            {messError ? (
              <Alert tone="error" onClose={() => setMessError(null)}>
                {messError}
              </Alert>
            ) : null}
            <Field label="মেসের নাম" htmlFor="settings-mess-name">
              <Input
                id="settings-mess-name"
                value={messName}
                onChange={(event) => setMessName(event.target.value)}
                disabled={!isManager}
                required
              />
            </Field>
            <Field label="Currency" htmlFor="settings-currency" hint="যেমন: ৳, ₹, $">
              <div className="w-24">
                <Input
                  id="settings-currency"
                  value={messCurrency}
                  onChange={(event) => setMessCurrency(event.target.value)}
                  maxLength={3}
                  disabled={!isManager}
                  className="text-center text-lg font-bold"
                />
              </div>
            </Field>
            {isManager ? (
              <Button type="submit" loading={savingMess} icon={Save}>
                সেভ করুন
              </Button>
            ) : (
              <p className="text-xs text-slate-500">শুধু ম্যানেজার মেসের তথ্য পরিবর্তন করতে পারবেন।</p>
            )}
          </form>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">ইনভাইট কোড</p>
                <p className="num mt-0.5 text-lg font-bold tracking-[0.2em] text-teal-800">{activeMess?.mess.invite_code}</p>
              </div>
              <Link to="/members">
                <Button variant="secondary" size="sm" icon={Users}>
                  সদস্য
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <SectionTitle title="Cloud সংযোগ" description={mode === 'demo' ? 'ডেমো মোড চলছে' : 'Supabase-এর সাথে যুক্ত'} />
          {mode === 'demo' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-[13px] leading-relaxed text-amber-900">
                  এখন ডেটা শুধু এই ব্রাউজারে আছে। সব সদস্যের সাথে শেয়ার করতে Supabase Cloud চালু করুন।
                </p>
              </div>
              <Button icon={Cloud} onClick={() => setCloudOpen(true)}>
                Cloud চালু করুন
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" icon={RefreshCw} onClick={() => setResetOpen(true)}>
                  ডেমো রিসেট
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-emerald-900">ক্লাউড সিঙ্ক চালু</p>
                  <p className="mt-0.5 truncate text-[11px] text-emerald-800/80">
                    {config ? new URL(config.url).host : 'Supabase'}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
                ডেটা আপনার নিজের Supabase প্রজেক্টে সংরক্ষিত আছে। এখান থেকে ডিসকানেক্ট করলে শুধু এই ব্রাউজারের সংযোগ মুছে যাবে, ডেটা মুছবে না।
              </div>
              {!hasEnvConfig ? (
                <Button variant="secondary" icon={Unplug} onClick={() => setDisconnectOpen(true)}>
                  ডিসকানেক্ট
                </Button>
              ) : (
                <p className="text-[11px] text-slate-400">এই ডিপ্লয়মেন্টে env variable দিয়ে সংযোগ দেওয়া আছে।</p>
              )}
            </div>
          )}
        </section>

        <section className="card p-4 sm:p-5">
          <SectionTitle title="অ্যাকাউন্ট" description="আপনার প্রোফাইল" />
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? 'সদস্য'} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <Badge tone={isManager ? 'teal' : 'slate'} className="mt-1.5">
                {isManager ? 'ম্যানেজার' : 'সদস্য'}
              </Badge>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={LogOut} onClick={handleSignOut}>
              লগ আউট
            </Button>
            <Button variant="secondary" icon={Wallet} onClick={() => setLeaveOpen(true)} disabled={isManager || mode === 'demo'}>
              মেস ছাড়ুন
            </Button>
          </div>
          {isManager ? (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              ম্যানেজার মেস ছাড়তে পারবেন না।
            </p>
          ) : null}
        </section>

        <section className="card p-4 sm:p-5">
          <SectionTitle title="অন্য মেস" description="একাধিক মেসে থাকলে এখান থেকে বদলান" />
          <div className="space-y-2">
            {memberships.map((item) => (
              <div
                key={item.mess.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  item.mess.id === activeMess?.mess.id ? 'border-teal-200 bg-teal-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-700 ring-1 ring-slate-200">
                  <Settings className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.mess.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.role === 'manager' ? 'ম্যানেজার' : 'সদস্য'} · যোগ {formatDate(item.joined_at.slice(0, 10), true)}
                  </p>
                </div>
                {item.mess.id === activeMess?.mess.id ? (
                  <Badge tone="teal">সক্রিয়</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => switchMess(item.mess.id)}>
                    বদলান
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)} disabled={mode === 'demo'}>
              নতুন মেস
            </Button>
            <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => setJoinOpen(true)} disabled={mode === 'demo'}>
              কোড দিয়ে join
            </Button>
          </div>
        </section>
      </div>

      <section className="card mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">ডেটা ব্যাকআপ</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              মাস শেষে সারসংক্ষেপ থেকে CSV ডাউনলোড করুন বা প্রিন্ট করে PDF সেভ করুন। Supabase free tier-এ আলাদা ব্যাকআপ না থাকায় নিজে ব্যাকআপ রাখা ভালো।
            </p>
          </div>
          <Link to="/summary" className="shrink-0">
            <Button variant="secondary" icon={Database}>
              সারসংক্ষেপে যান
            </Button>
          </Link>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        মেস খাতা · v1.0.0 · {formatMonth(month)} · সর্বশেষ আপডেট {formatDate(new Date().toISOString().slice(0, 10), true)}
      </p>

      <Modal
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        title="Cloud চালু করুন"
        description="Supabase Project URL ও anon public key দিন।"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCloudOpen(false)} disabled={connecting}>
              বাতিল
            </Button>
            <Button type="submit" form="cloud-form" loading={connecting} icon={Cloud}>
              কানেক্ট করুন
            </Button>
          </div>
        }
      >
        <form id="cloud-form" onSubmit={handleConnectCloud} className="space-y-4">
          {cloudError ? (
            <Alert tone="error" onClose={() => setCloudError(null)}>
              {cloudError}
            </Alert>
          ) : null}
          <Field label="Project URL" htmlFor="settings-cloud-url">
            <Input
              id="settings-cloud-url"
              type="url"
              value={cloudUrl}
              onChange={(event) => setCloudUrl(event.target.value)}
              placeholder="https://xxxxx.supabase.co"
              required
            />
          </Field>
          <Field label="Anon public key" htmlFor="settings-cloud-key">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="settings-cloud-key"
                type={showKey ? 'text' : 'password'}
                value={cloudKey}
                onChange={(event) => setCloudKey(event.target.value)}
                placeholder="eyJhbGciOi..."
                className="pl-9 pr-10 font-mono text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label={showKey ? 'key লুকান' : 'key দেখান'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <p className="text-[11px] leading-relaxed text-slate-400">
            আগে Supabase SQL Editor-এ <code>supabase/schema.sql</code> চালাতে হবে। বিস্তারিত নির্দেশনা প্রথম স্ক্রিনে আছে।
          </p>
        </form>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="নতুন মেস তৈরি করুন"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={messActionLoading}>
              বাতিল
            </Button>
            <Button type="submit" form="create-mess-form" loading={messActionLoading} icon={Plus}>
              তৈরি করুন
            </Button>
          </div>
        }
      >
        <form id="create-mess-form" onSubmit={handleCreateMess} className="space-y-4">
          {messActionError ? <Alert tone="error">{messActionError}</Alert> : null}
          <Field label="মেসের নাম" htmlFor="new-mess-name">
            <Input id="new-mess-name" value={newMessName} onChange={(event) => setNewMessName(event.target.value)} placeholder="যেমন: নতুন মেস" required />
          </Field>
        </form>
      </Modal>

      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="ইনভাইট কোড দিয়ে যোগ দিন"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setJoinOpen(false)} disabled={messActionLoading}>
              বাতিল
            </Button>
            <Button type="submit" form="join-mess-form" loading={messActionLoading} icon={ArrowRight}>
              যোগ দিন
            </Button>
          </div>
        }
      >
        <form id="join-mess-form" onSubmit={handleJoinMess} className="space-y-4">
          {messActionError ? <Alert tone="error">{messActionError}</Alert> : null}
          <Field label="ইনভাইট কোড" htmlFor="join-mess-code">
            <Input
              id="join-mess-code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              className="num tracking-[0.2em]"
              maxLength={10}
              required
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={leaveOpen}
        title="মেস থেকে বের হবেন?"
        description="আপনার পুরনো এন্ট্রি থেকে যাবে, তবে আপনি আর এই মেসের হিসাব দেখতে পাবেন না।"
        confirmLabel="বের হয়ে যান"
        loading={leaving}
        onConfirm={handleLeave}
        onClose={() => setLeaveOpen(false)}
      />

      <ConfirmDialog
        open={disconnectOpen}
        title="Cloud ডিসকানেক্ট করবেন?"
        description="শুধু এই ব্রাউজার থেকে সংযোগ মুছে যাবে। Supabase-এর ডেটা নিরাপদ থাকবে।"
        confirmLabel="ডিসকানেক্ট"
        loading={false}
        onConfirm={handleDisconnect}
        onClose={() => setDisconnectOpen(false)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="ডেমো ডেটা রিসেট করবেন?"
        description="সব ডেমো এন্ট্রি মুছে নতুন ডেমো ডেটা তৈরি হবে।"
        confirmLabel="রিসেট করুন"
        loading={resetting}
        onConfirm={handleResetDemo}
        onClose={() => setResetOpen(false)}
      />
    </div>
  )
}
