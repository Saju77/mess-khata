import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Link2, RefreshCw, Settings, Share2, UserMinus, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { balanceTone, calculateMonth, memberName } from '../lib/calc'
import { formatDate, formatMeals, formatMoney, formatMonth } from '../lib/format'
import { friendlyError } from '../lib/errors'
import type { Member } from '../lib/types'
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  SectionTitle,
  Select,
  StatCard,
} from '../components/ui'

export function MembersPage() {
  const { activeMess, members, month, monthData, regenerateInvite, removeMember, transferManager, mode } = useApp()
  const currency = activeMess?.mess.currency || '৳'
  const isManager = activeMess?.role === 'manager'
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<Member | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)

  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const summary = useMemo(
    () => calculateMonth(members, monthData.meals, monthData.expenses, monthData.deposits, start, end),
    [members, monthData, start, end],
  )

  const inviteCode = activeMess?.mess.invite_code ?? ''
  const inviteLink = `${window.location.origin}/onboarding?code=${inviteCode}`

  const activeCount = members.filter((member) => !member.left_at).length

  const copy = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      toast.success(kind === 'code' ? 'ইনভাইট কোড কপি হয়েছে।' : 'ইনভাইট লিংক কপি হয়েছে।')
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error('কপি করা যায়নি।')
    }
  }

  const share = async () => {
    const text = `${activeMess?.mess.name ?? 'মেস'} — মেস খাতায় যোগ দিন। ইনভাইট কোড: ${inviteCode}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'মেস খাতা', text, url: inviteLink })
        return
      } catch {
        // user cancelled; fall back to copy
      }
    }
    await copy(`${text}\n${inviteLink}`, 'link')
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const code = await regenerateInvite()
      toast.success(`নতুন ইনভাইট কোড: ${code}`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setRegenerating(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await removeMember(removeTarget.user_id)
      toast.success(`${memberName(removeTarget)}-কে মেস থেকে সরানো হয়েছে।`)
      setRemoveTarget(null)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setRemoving(false)
    }
  }

  const openTransfer = () => {
    const others = members.filter((m) => !m.left_at && m.role !== 'manager')
    setTransferTarget(others.length === 1 ? others[0] : null)
    setTransferOpen(true)
  }

  const handleTransfer = async () => {
    if (!transferTarget || !transferTarget.user_id) {
      toast.error('নতুন ম্যানেজার বেছে নিন।')
      return
    }
    setTransferring(true)
    try {
      await transferManager(transferTarget.user_id)
      toast.success(`${memberName(transferTarget)}-কে ম্যানেজার বানানো হয়েছে।`)
      setTransferTarget(null)
      setTransferOpen(false)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="সদস্য"
        subtitle="মেসের সদস্য, তাদের ভূমিকা ও এই মাসের হিসাব।"
        actions={
          <>
            {isManager ? (
              <>
                <Button variant="secondary" icon={RefreshCw} onClick={handleRegenerate} loading={regenerating}>
                  নতুন কোড
                </Button>
                <Button variant="secondary" icon={UserPlus} onClick={openTransfer}>
                  ম্যানেজার বদলান
                </Button>
              </>
            ) : null}
            <Link to="/settings">
              <Button variant="secondary" icon={Settings}>
                মেস সেটিংস
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="মোট সদস্য" value={String(members.length)} hint={`${activeCount} জন সক্রিয়`} icon={Users} tone="teal" />
        <StatCard label="ম্যানেজার" value={members.find((member) => member.role === 'manager')?.profile.full_name ?? '—'} hint="মেস পরিচালনা করেন" icon={UserPlus} tone="violet" />
        <StatCard label="এই মাসের জমা" value={formatMoney(summary.totalDeposits, currency)} hint={formatMonth(month)} icon={Check} tone="emerald" />
        <StatCard label="মোট মিল" value={formatMeals(summary.totalMeals)} hint={`${summary.activeMembers.length} জনের`} icon={Users} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-br from-teal-700 to-teal-900 px-5 py-4 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4" /> সদস্য যোগ করুন
            </div>
            <p className="mt-1 text-xs leading-relaxed text-teal-100/75">
              সদস্যকে অ্যাপের লিংক বা নিচের কোডটি পাঠান। সে নিজের অ্যাকাউন্ট খুলে কোড দিয়ে যোগ দেবে।
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700/70">ইনভাইট কোড</p>
              <p className="num mt-1 text-3xl font-bold tracking-[0.22em] text-teal-900">{inviteCode || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" icon={copied === 'code' ? Check : Copy} onClick={() => copy(inviteCode, 'code')}>
                কোড কপি
              </Button>
              <Button variant="secondary" icon={copied === 'link' ? Check : Link2} onClick={() => copy(inviteLink, 'link')}>
                লিংক কপি
              </Button>
            </div>
            <Button variant="soft" icon={Share2} className="w-full" onClick={share}>
              শেয়ার করুন
            </Button>
            {mode === 'demo' ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                ডেমো মোডে ইনভাইট কোডটি শুধু দেখানোর জন্য। Cloud চালু করলে আসল কোড কাজ করবে।
              </p>
            ) : null}
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
              ১. সদস্য <strong>Mess Khata</strong> লিংকটি খুলবে<br />
              ২. “নতুন অ্যাকাউন্ট” দিয়ে ইমেইল/পাসওয়ার্ড দিয়ে সাইন আপ করবে<br />
              ৩. এই ইনভাইট কোডটি দিয়ে মেসে যোগ দেবে
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <SectionTitle title="সদস্যদের তালিকা" description={`${members.length} জন · ${formatMonth(month)}-এর হিসাব`} />
          </div>

          {members.length === 0 ? (
            <EmptyState icon={Users} title="কোনো সদস্য নেই" description="ইনভাইট কোড দিয়ে সদস্য যোগ করুন।" />
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const row = summary.rows.find((item) => item.member.user_id === member.user_id)
                const tone = row ? balanceTone(row.balance) : 'settled'
                return (
                  <div key={member.user_id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={memberName(member)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-slate-800">{memberName(member)}</p>
                          {member.role === 'manager' ? <Badge tone="teal">ম্যানেজার</Badge> : null}
                          {member.left_at ? <Badge tone="slate">বের হয়েছেন</Badge> : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {member.profile.email ?? 'ইমেইল নেই'} · যোগ দিয়েছেন {formatDate(member.joined_at.slice(0, 10), true)}
                        </p>
                      </div>
                      {isManager && !member.left_at && member.role !== 'manager' ? (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(member)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`${memberName(member)}-কে সরান`}
                          title="মেস থেকে সরান"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      ) : null}
                      {isManager && !member.left_at && member.role === 'member' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTransferTarget(member)
                            setTransferOpen(true)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                          aria-label={`${memberName(member)}-কে ম্যানেজার করুন`}
                          title="ম্যানেজার করুন"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2.5 grid grid-cols-4 gap-2 rounded-lg bg-slate-50/80 px-3 py-2 text-center">
                      <div>
                        <p className="num text-xs font-bold text-slate-700">{formatMeals(row?.meals ?? 0)}</p>
                        <p className="text-[10px] text-slate-400">মিল</p>
                      </div>
                      <div>
                        <p className="num text-xs font-bold text-slate-700">{formatMoney(row?.totalBill ?? 0, currency)}</p>
                        <p className="text-[10px] text-slate-400">বিল</p>
                      </div>
                      <div>
                        <p className="num text-xs font-bold text-slate-700">{formatMoney(row?.deposit ?? 0, currency)}</p>
                        <p className="text-[10px] text-slate-400">জমা</p>
                      </div>
                      <div>
                        <p className={`num text-xs font-bold ${tone === 'due' ? 'text-rose-600' : tone === 'advance' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {tone === 'settled' ? '০' : formatMoney(Math.abs(row?.balance ?? 0), currency)}
                        </p>
                        <p className="text-[10px] text-slate-400">{tone === 'due' ? 'দিতে হবে' : tone === 'advance' ? 'পাওনা' : 'সমান'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="সদস্যকে মেস থেকে সরাবেন?"
        description={removeTarget ? `${memberName(removeTarget)}-কে সরানো হলে তার পুরনো এন্ট্রি থাকবে, তবু নতুন করে মিল/জমা যোগ করা যাবে না।` : undefined}
        confirmLabel="সরিয়ে ফেলুন"
        loading={removing}
        onConfirm={handleRemove}
        onClose={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={transferOpen}
        title="ম্যানেজার বদলান?"
        description={
          transferTarget
            ? `${memberName(transferTarget)}-কে ম্যানেজার বানানো হলে বর্তমান ম্যানেজার সাধারণ সদস্য হয়ে যাবেন।`
            : 'নতুন ম্যানেজার বেছে নিন।'
        }
        confirmLabel="হ্যাঁ, বদলান"
        danger={false}
        loading={transferring}
        onConfirm={handleTransfer}
        onClose={() => {
          setTransferTarget(null)
          setTransferOpen(false)
        }}
      >
        <Field label="নতুন ম্যানেজার" htmlFor="new-manager-select">
          <Select
            id="new-manager-select"
            value={transferTarget?.user_id ?? ''}
            onChange={(event) => {
              const userId = event.target.value
              if (!userId) {
                setTransferTarget(null)
                return
              }
              const member = members.find((m) => m.user_id === userId)
              if (member) setTransferTarget(member)
            }}
          >
            <option value="">সদস্য বেছে নিন...</option>
            {members
              .filter((m) => !m.left_at && m.role !== 'manager')
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m)}
                </option>
              ))}
          </Select>
        </Field>
      </ConfirmDialog>
    </div>
  )
}
