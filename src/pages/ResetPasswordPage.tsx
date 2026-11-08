import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldAlert, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { Alert, Button, Field, Input } from '../components/ui'
import { PasswordResetRequest } from '../components/PasswordResetRequest'

// Supabase client তৈরি হওয়ার আগেই URL থেকে error পড়ে নেওয়া হয়,
// কারণ Supabase নিজে hash পরিষ্কার করে দিতে পারে।
function readRecoveryError(href: string): string | null {
  if (!href) return null
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const code = hash.get('error_code') || url.searchParams.get('error_code')
  const description = hash.get('error_description') || url.searchParams.get('error_description')
  if (!code && !description) return null
  if (code === 'otp_expired' || (description ?? '').toLowerCase().includes('expired')) {
    return 'লিংকটির মেয়াদ শেষ হয়ে গেছে বা এটি আগেই ব্যবহার করা হয়েছে।'
  }
  return 'লিংকটি ব্যবহার করা যায়নি।'
}

const initialError = typeof window === 'undefined' ? null : readRecoveryError(window.location.href)
const initialEmail =
  typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('email') ?? '')

export function ResetPasswordPage() {
  const { user, mode, updatePassword } = useApp()
  const navigate = useNavigate()
  const [linkError] = useState(initialError)
  const [email] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // ঠিকানা থেকে recovery token মুছে ফেলা হয়, যাতে রিফ্রেশে আবার ব্যবহার না হয়
  useEffect(() => {
    if (user && window.location.hash) {
      window.history.replaceState({}, '', `/reset-password${window.location.search}`)
    }
  }, [user])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }
    if (password !== confirm) {
      setError('দুইবার লেখা পাসওয়ার্ড মিলছে না।')
      return
    }
    setSaving(true)
    try {
      await updatePassword(password)
      setPassword('')
      setConfirm('')
      setDone(true)
      toast.success('পাসওয়ার্ড সফলভাবে বদলানো হয়েছে!')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-teal-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <UtensilsCrossed className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-none">
            <p className="text-lg font-bold text-slate-900">মেস খাতা</p>
            <p className="mt-1 text-[10px] tracking-[0.16em] text-slate-400">MESS KHATA</p>
          </div>
        </div>

        {linkError ? (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <ShieldAlert className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">লিংকটি আর কাজ করছে না</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{linkError} নিচে ইমেইল দিয়ে নতুন লিংক চেয়ে নিন।</p>
            <div className="mt-5">
              <PasswordResetRequest initialEmail={email} />
            </div>
          </>
        ) : done ? (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">পাসওয়ার্ড বদলানো হয়েছে</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              এখন নতুন পাসওয়ার্ড দিয়েই অ্যাপে ঢুকতে পারবেন। পাসওয়ার্ডটি নিরাপদ জায়গায় লিখে রাখুন।
            </p>
            <Button className="mt-5 w-full" icon={ArrowRight} onClick={() => navigate('/', { replace: true })}>
              মেস খাতায় যান
            </Button>
          </>
        ) : user ? (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">নতুন পাসওয়ার্ড দিন</h1>
            <p className="mt-1 break-all text-sm leading-relaxed text-slate-500">
              <strong className="text-slate-700">{user.email}</strong> অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড সেট করুন।
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === 'demo' ? (
                <Alert tone="warning">
                  এটি ডেমো মোড — এখানে পাসওয়ার্ড সেভ হবে না। Cloud মোডে লগইন করে ব্যবহার করুন।
                </Alert>
              ) : null}

              {error ? (
                <Alert tone="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              ) : null}

              <Field
                label="নতুন পাসওয়ার্ড"
                htmlFor="reset-new-password"
                hint="কমপক্ষে ৬ অক্ষর। আগের পাসওয়ার্ড থেকে আলাদা রাখুন।"
              >
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="আবার লিখুন" htmlFor="reset-confirm-password">
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </Field>

              <Button type="submit" className="w-full" loading={saving} icon={ArrowRight}>
                পাসওয়ার্ড সেভ করুন
              </Button>
            </form>
          </>
        ) : (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">পাসওয়ার্ড রিসেট</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              ইমেইলে পাঠানো লিংকটি খুললে এই পেজে নতুন পাসওয়ার্ড দেওয়া যাবে। লিংক না থাকলে নিচে ইমেইল দিয়ে নতুন লিংক চেয়ে নিন।
            </p>
            <div className="mt-5">
              <PasswordResetRequest initialEmail={email} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          লগইন পেজে ফিরে যান
        </button>
      </div>
    </div>
  )
}
