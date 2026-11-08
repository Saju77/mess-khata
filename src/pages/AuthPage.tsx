import { useState } from 'react'
import {
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { Alert, Button, Field, Input } from '../components/ui'
import { PasswordResetRequest } from '../components/PasswordResetRequest'

type Tab = 'login' | 'signup'

export function AuthPage() {
  const { signIn, signUp } = useApp()
  const [tab, setTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  const switchTab = (next: Tab) => {
    setTab(next)
    setForgot(false)
    setError(null)
    setConfirmationEmail(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }
    if (tab === 'signup' && name.trim().length < 2) {
      setError('আপনার নাম লিখুন।')
      return
    }
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(email, password)
        toast.success('স্বাগতম!')
      } else {
        const result = await signUp(name, email, password)
        if (result.needsConfirmation) {
          setConfirmationEmail(email)
          setPassword('')
        } else {
          toast.success('অ্যাকাউন্ট তৈরি হয়েছে!')
        }
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-teal-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between bg-[#0c2f2a] p-8 text-white lg:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <div className="leading-none">
                <p className="text-lg font-bold">মেস খাতা</p>
                <p className="mt-1 text-[10px] tracking-[0.16em] text-teal-200/60">MESS KHATA</p>
              </div>
            </div>
            <h2 className="mt-12 text-3xl font-bold leading-tight">
              মেসের হিসাব
              <br />
              আর ঝামেলা নয়।
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-teal-100/70">
              মিল, বাজার, জমা — সবাই একসাথে এন্ট্রি করবে, আর হিসাব নিজে থেকেই হবে।
            </p>

            <ul className="mt-8 space-y-3 text-sm text-teal-50/90">
              {[
                'অটোমেটিক মিল রেট ও ব্যালেন্স',
                'সব সদস্যের জন্য আলাদা লগইন',
                'মাস শেষে CSV / PDF রিপোর্ট',
                'নিজের Supabase-এ ডেটা',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-teal-100/70">
            <Cloud className="h-4 w-4 text-teal-300" />
            Supabase Cloud-এর সাথে যুক্ত
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <p className="text-lg font-bold text-slate-900">মেস খাতা</p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {forgot ? 'পাসওয়ার্ড ভুলে গেছেন?' : tab === 'login' ? 'আবার স্বাগতম' : 'নতুন অ্যাকাউন্ট'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {forgot
              ? 'অ্যাকাউন্টের ইমেইল দিন — নতুন পাসওয়ার্ড সেট করার লিংক পাঠানো হবে।'
              : tab === 'login'
                ? 'মেসের হিসাব দেখতে লগইন করুন।'
                : 'নিজের নাম, ইমেইল ও পাসওয়ার্ড দিয়ে শুরু করুন।'}
          </p>

          {forgot ? null : (
            <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                লগইন
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                নতুন অ্যাকাউন্ট
              </button>
            </div>
          )}

          {forgot ? (
            <div className="mt-5">
              <PasswordResetRequest
                initialEmail={email}
                onBack={() => {
                  setForgot(false)
                  setError(null)
                }}
              />
            </div>
          ) : confirmationEmail ? (
            <div className="mt-5">
              <Alert tone="success" title="ইমেইল যাচাই করুন">
                <p>
                  <strong>{confirmationEmail}</strong> এ একটি যাচাই লিংক পাঠানো হয়েছে। লিংকে ক্লিক করার পর লগইন করুন।
                </p>
                <button
                  type="button"
                  className="mt-2 font-semibold text-emerald-800 underline"
                  onClick={() => {
                    setConfirmationEmail(null)
                    setTab('login')
                  }}
                >
                  লগইনে ফিরে যান
                </button>
              </Alert>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error ? (
                <Alert tone="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              ) : null}

              {tab === 'signup' ? (
                <Field label="আপনার নাম" htmlFor="auth-name">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="auth-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="যেমন: রাহিম উদ্দিন"
                      className="pl-9"
                      autoComplete="name"
                      required
                    />
                  </div>
                </Field>
              ) : null}

              <Field label="ইমেইল" htmlFor="auth-email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </Field>

              <Field
                label="পাসওয়ার্ড"
                htmlFor="auth-password"
                hint={tab === 'signup' ? 'কমপক্ষে ৬ অক্ষর। মনে রাখার মতো একটি পাসওয়ার্ড দিন।' : undefined}
              >
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
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

              {tab === 'login' ? (
                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgot(true)
                      setError(null)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
              ) : null}

              <Button type="submit" className="w-full" loading={loading} icon={ArrowRight}>
                {tab === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
              </Button>
            </form>
          )}

          {!forgot ? (
            <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
              পাসওয়ার্ড ভুলে গেলে “পাসওয়ার্ড ভুলে গেছেন?” থেকে ইমেইল দিন। রিসেট লিংক ইমেইলে চলে যাবে।
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
