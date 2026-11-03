import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, KeyRound, LogOut, Plus, UtensilsCrossed, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { Alert, Button, Field, Input } from '../components/ui'

export function OnboardingPage() {
  const { createMess, joinMess, signOut, user } = useApp()
  const [searchParams] = useSearchParams()
  const codeFromLink = searchParams.get('code')?.toUpperCase() ?? ''
  const [name, setName] = useState('')
  const [code, setCode] = useState(codeFromLink)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (codeFromLink) setCode(codeFromLink)
  }, [codeFromLink])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (name.trim().length < 2) {
      setError('মেসের নাম কমপক্ষে ২ অক্ষরের হতে হবে।')
      return
    }
    setCreating(true)
    try {
      await createMess(name.trim())
      toast.success('মেস তৈরি হয়েছে! এখন সদস্যদের ইনভাইট কোড পাঠান।')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('ইনভাইট কোডটি সঠিকভাবে লিখুন।')
      return
    }
    setJoining(true)
    try {
      await joinMess(trimmed)
      toast.success('মেসে যোগ দিয়েছেন!')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setJoining(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/20">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <p className="text-lg font-bold tracking-tight text-slate-900">মেস খাতা</p>
              <p className="mt-1 text-[10px] font-medium tracking-[0.16em] text-slate-400">MESS KHATA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" /> লগ আউট
          </button>
        </header>

        <div className="mt-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            স্বাগতম{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            শুরু করতে একটি নতুন মেস তৈরি করুন, অথবা ম্যানেজারের পাঠানো ইনভাইট কোড দিয়ে যোগ দিন।
          </p>
        </div>

        {error ? (
          <div className="mx-auto mt-5 max-w-xl">
            <Alert tone="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        ) : null}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <section className="card p-5 sm:p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Plus className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">নতুন মেস তৈরি করুন</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              আপনি ম্যানেজার হবেন। মেসের নাম দিন, তারপর সদস্যদের ইনভাইট কোড পাঠান।
            </p>
            <form onSubmit={handleCreate} className="mt-5 space-y-3">
              <Field label="মেসের নাম" htmlFor="mess-name">
                <Input
                  id="mess-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="যেমন: সবুজ ছায়া মেস"
                  required
                />
              </Field>
              <Button type="submit" className="w-full" loading={creating} icon={ArrowRight}>
                মেস তৈরি করুন
              </Button>
            </form>
          </section>

          <section className="card p-5 sm:p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <KeyRound className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">ইনভাইট কোড দিয়ে যোগ দিন</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              মেসের ম্যানেজার যে ৬ অক্ষরের কোডটি দিয়েছেন, সেটি এখানে লিখুন।
            </p>
            <form onSubmit={handleJoin} className="mt-5 space-y-3">
              <Field label="ইনভাইট কোড" htmlFor="invite-code">
                <Input
                  id="invite-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="num tracking-[0.2em]"
                  maxLength={10}
                  autoCapitalize="characters"
                  required
                />
              </Field>
              <Button type="submit" variant="dark" className="w-full" loading={joining} icon={Users}>
                মেসে যোগ দিন
              </Button>
            </form>
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          একটি অ্যাকাউন্ট একাধিক মেসে যোগ দিতে পারে। পরে সেটিংস থেকে মেস বদলানো যাবে।
        </p>
      </div>
    </div>
  )
}
