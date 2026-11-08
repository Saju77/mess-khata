import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { friendlyError } from '../lib/errors'
import { Alert, Button, Field, Input } from './ui'

export function PasswordResetRequest({
  initialEmail = '',
  onBack,
}: {
  initialEmail?: string
  onBack?: () => void
}) {
  const { mode, requestPasswordReset } = useApp()
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('অ্যাকাউন্টের ইমেইলটি লিখুন।')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSentTo(email.trim())
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="ইমেইল পাঠানো হয়েছে">
          <p>
            <strong className="break-all">{sentTo}</strong>-এ একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।
          </p>
          <p className="mt-1">ইমেইল না পেলে Spam / Junk ফোল্ডার দেখুন। লিংকটির মেয়াদ সীমিত, তাই দ্রুত নতুন পাসওয়ার্ড সেট করুন।</p>
          <p className="mt-1 text-xs opacity-80">এই ইমেইলে কোনো অ্যাকাউন্ট না থাকলে কোনো লিংক পাঠানো হয় না।</p>
        </Alert>
        <Button variant="secondary" className="w-full" onClick={() => setSentTo(null)}>
          আরেকটি ইমেইল পাঠান
        </Button>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-sm font-semibold text-teal-700 hover:underline"
          >
            লগইনে ফিরে যান
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'demo' ? (
        <Alert tone="warning">
          এটি ডেমো মোড — এখানে ইমেইল পাঠানো হবে না। Cloud মোডে এই ফিচারটি কাজ করে।
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Field
        label="অ্যাকাউন্টের ইমেইল"
        htmlFor="reset-request-email"
        hint="মেসে যে ইমেইল দিয়ে অ্যাকাউন্ট খোলা হয়েছে সেটিই দিন।"
      >
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="reset-request-email"
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

      <Button type="submit" className="w-full" loading={loading} icon={Send}>
        রিসেট লিংক পাঠান
      </Button>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm font-semibold text-teal-700 hover:underline"
        >
          লগইনে ফিরে যান
        </button>
      ) : null}
    </form>
  )
}
