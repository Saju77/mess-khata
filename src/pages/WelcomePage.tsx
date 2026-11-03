import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import schemaSql from '../../supabase/schema.sql?raw'
import { useApp } from '../context/AppContext'
import { testSupabaseConnection } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { validConfigShape } from '../lib/config'
import { Alert, Button, Field, Input } from '../components/ui'

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="mt-1 text-[13px] leading-relaxed text-slate-500">{children}</div>
      </div>
    </div>
  )
}

export function WelcomePage() {
  const { connectCloud, enterDemo } = useApp()
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql)
      toast.success('SQL কপি হয়েছে। Supabase SQL Editor-এ paste করুন।')
    } catch {
      toast.error('কপি করা যায়নি। ফাইলটি ম্যানুয়ালি খুলে কপি করুন।')
    }
  }

  const downloadSql = () => {
    const blob = new Blob([schemaSql], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'messkhata-supabase-schema.sql'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!validConfigShape(url, anonKey)) {
      setError('Project URL এবং anon public key সঠিকভাবে দিন।')
      return
    }
    setLoading(true)
    try {
      const config = { url: url.trim(), anonKey: anonKey.trim() }
      const check = await testSupabaseConnection(config)
      if (!check.ok) {
        setError(check.message)
        return
      }
      connectCloud(config)
      toast.success('Cloud চালু হয়েছে!')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/20">
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-none">
              <p className="text-lg font-bold tracking-tight text-slate-900">মেস খাতা</p>
              <p className="mt-1 text-[10px] font-medium tracking-[0.16em] text-slate-400">MESS KHATA</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={enterDemo} icon={Sparkles}>
            ডেমো দেখুন
          </Button>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:mt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <section className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-600/10">
              <ShieldCheck className="h-3.5 w-3.5" /> নিজের ডেটা, নিজের নিয়ন্ত্রণ
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              মেসের হিসাব,
              <br />
              <span className="text-teal-700">এখন নিজের হাতে।</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              মিল, বাজার, জমা আর মাস শেষের হিসাব — সব এক জায়গায়। কোনো ad নেই, coin নেই,
              আর ডেটা থাকে আপনার নিজের Supabase প্রজেক্টে।
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Cloud, title: 'মাল্টি-ডিভাইস', text: 'সব সদস্য নিজের ফোন থেকে দেখবে ও এন্ট্রি করবে।' },
                { icon: Database, title: 'নিজের ডেটাবেস', text: 'Supabase free tier-এ চলে, মাসে ০ টাকা।' },
                { icon: ShieldCheck, title: 'RLS সুরক্ষা', text: 'শুধু আপনার মেসের সদস্যরাই ডেটা দেখতে পাবে।' },
                { icon: Sparkles, title: 'অটো হিসাব', text: 'মিল রেট, বিল, জমা ও ব্যালেন্স নিজে থেকেই হবে।' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 rounded-xl border border-slate-200/70 bg-white/70 p-3.5 backdrop-blur">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">আগে দেখে নিতে চান?</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    ডেমো মোডে ডামি ডেটা দিয়ে পুরো অ্যাপ চালিয়ে দেখুন। পরে Cloud চালু করলেই আসল মেস।
                  </p>
                  <Button size="sm" variant="soft" className="mt-2.5" onClick={enterDemo} icon={ArrowRight}>
                    ডেমো খুলুন
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="animate-fade-up lg:sticky lg:top-8" style={{ animationDelay: '80ms' }}>
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-br from-teal-700 to-teal-900 px-5 py-4 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Cloud className="h-4 w-4" /> Cloud চালু করুন
                </div>
                <p className="mt-1 text-xs text-teal-100/80">
                  Supabase free tier · কার্ড লাগে না · ৫ মিনিটের সেটআপ
                </p>
              </div>

              <div className="space-y-4 px-5 py-5">
                <Step number={1} title="Supabase-এ ফ্রি প্রজেক্ট খুলুন">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                  >
                    supabase.com/dashboard <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  এ গিয়ে নতুন প্রজেক্ট তৈরি করুন।
                </Step>

                <Step number={2} title="SQL schema চালান">
                  Supabase-এর <strong>SQL Editor</strong> খুলে নিচের SQL কপি করে Run করুন।
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="soft" icon={Copy} onClick={copySql}>
                      SQL কপি করুন
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={downloadSql}>
                      .sql ডাউনলোড
                    </Button>
                  </div>
                  <details className="group mt-2 rounded-lg border border-slate-200 bg-slate-50">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600">
                      SQL দেখুন
                      <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                    </summary>
                    <pre className="scroll-thin max-h-52 overflow-auto border-t border-slate-200 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                      {schemaSql}
                    </pre>
                  </details>
                </Step>

                <Step number={3} title="URL ও anon key কপি করুন">
                  Project Settings → API থেকে <strong>Project URL</strong> ও{' '}
                  <strong>anon public key</strong> কপি করুন।
                </Step>

                <Step number={4} title="Authentication ঠিক করুন">
                  Authentication → Providers → Email-এ গিয়ে <strong>Confirm email</strong> বন্ধ রাখুন
                  (দ্রুত শুরু করার জন্য)। চাইলে পরে চালু করতে পারেন।
                </Step>
              </div>

              <form onSubmit={handleConnect} className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5">
                {error ? (
                  <Alert tone="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                ) : null}
                <Field label="Project URL" htmlFor="supabase-url">
                  <Input
                    id="supabase-url"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://xxxxx.supabase.co"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field label="Anon public key" htmlFor="supabase-key" hint="এটি public key — ব্রাউজারে রাখা নিরাপদ। RLS ডেটা সুরক্ষিত রাখে।">
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="supabase-key"
                      type={showKey ? 'text' : 'password'}
                      value={anonKey}
                      onChange={(event) => setAnonKey(event.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="pl-9 pr-10 font-mono text-xs"
                      autoComplete="off"
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
                <Button type="submit" className="w-full" loading={loading} icon={Cloud}>
                  কানেক্ট করুন
                </Button>
                <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <Check className="h-3 w-3" /> কোনো password বা গোপন key এখানে দেবেন না
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
