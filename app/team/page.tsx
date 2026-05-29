'use client'

import { useState, useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useTeam, getWeekStart, formatWeekLabel } from '@/lib/hooks/useTeam'
import type { TeamMember, TimeEntry } from '@/lib/hooks/useTeam'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Plus, ChevronDown, ChevronUp, Clock,
  Trash2, Mail, Check, X, ChevronLeft, ChevronRight,
  Play, Square
} from 'lucide-react'

function formatHours(hours: number | null | undefined): string {
  if (!hours) return '0m'
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function InviteForm({ onInvite, onClose }: {
  onInvite: (name: string, email: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    setSaving(true)
    try { await onInvite(name, email); onClose() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setSaving(false) }
  }

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-semibold text-slate-900">Invite team member</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jess Liu" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jess@email.com" className={inputClass} />
            <p className="text-[11px] text-slate-400 mt-1">They'll receive an email to set up their login.</p>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>
              <Mail className="w-4 h-4" /> Send invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PermRow({ label, sub, checked, onChange }: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center py-2.5 border-b border-slate-100 last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-teal-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function LogHoursForm({ members, onLog, onClose }: {
  members: TeamMember[]
  onLog: (memberId: string, hours: number, date: string, notes: string) => Promise<void>
  onClose: () => void
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [hours, setHours] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) { setError('Select a team member.'); return }
    if (!hours || parseFloat(hours) <= 0) { setError('Enter valid hours.'); return }
    setSaving(true)
    try { await onLog(memberId, parseFloat(hours), date, notes); onClose() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setSaving(false) }
  }

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-semibold text-slate-900">Log hours manually</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Team member</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)} className={inputClass}>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Hours worked</label>
              <input type="number" min="0.5" max="24" step="0.5" value={hours}
                onChange={e => setHours(e.target.value)} placeholder="3.5" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Deep clean, extra time" className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>
              <Clock className="w-4 h-4" /> Log hours
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberClockCard({ member, ownerId, timeEntries, onRefresh }: {
  member: TeamMember
  ownerId: string
  timeEntries: TimeEntry[]
  onRefresh: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayEntries = timeEntries.filter(e => e.team_member_id === member.id && e.work_date === today)
  const activeEntry = todayEntries.find(e => !e.clock_out)
  const completedEntries = todayEntries.filter(e => e.clock_out)
  const todayTotal = completedEntries.reduce((s, e) => s + (e.hours ?? 0), 0)

  useEffect(() => {
    if (activeEntry) {
      const secs = Math.floor((Date.now() - new Date(activeEntry.clock_in).getTime()) / 1000)
      setElapsed(secs)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeEntry?.id])

  const clockIn = async () => {
    setLoading(true)
    await supabase.from('time_entries').insert([{
      owner_id: ownerId,
      team_member_id: member.id,
      clock_in: new Date().toISOString(),
      work_date: today,
    }])
    setLoading(false)
    window.location.reload()
  }

  const clockOut = async () => {
    if (!activeEntry) return
    setLoading(true)
    await supabase.from('time_entries').update({ clock_out: new Date().toISOString() }).eq('id', activeEntry.id)
    setLoading(false)
    window.location.reload()
  }

  function formatElapsed(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  function formatTs(ts: string) {
    return new Date(ts).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-slate-500">Today's clock</p>
          <span title="Hours are rounded to the nearest 15 minutes." className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] flex items-center justify-center cursor-help font-semibold">?</span>
        </div>
        {todayTotal > 0 && <p className="text-xs font-semibold text-teal-600">{formatHours(todayTotal)} today</p>}
      </div>

      {activeEntry ? (
        <div className="bg-teal-50 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-600 font-medium">Clocked in at {formatTs(activeEntry.clock_in)}</p>
            <p className="text-lg font-semibold text-teal-700 font-mono">{formatElapsed(elapsed)}</p>
          </div>
          <button onClick={clockOut} disabled={loading}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
            <Square className="w-3 h-3" /> Clock out
          </button>
        </div>
      ) : (
        <button onClick={clockIn} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
          <Play className="w-3.5 h-3.5" />
          {loading ? 'Clocking in...' : `Clock in ${member.full_name.split(' ')[0]}`}
        </button>
      )}

      {completedEntries.length > 0 && (
        <div className="mt-2 space-y-1">
          {completedEntries.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs text-slate-500 py-1">
              <span>{formatTs(e.clock_in)} → {formatTs(e.clock_out!)}</span>
              <span className="font-medium text-teal-600">{e.hours?.toFixed(2)} hrs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamPage() {
  const { members, hoursLog, timeEntries, loading, error, inviteMember, updatePermissions, deactivateMember, logHours, deleteHours, deleteTimeEntry, fetchHours } = useTeam()
  const [ownerId, setOwnerId] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [showLogHours, setShowLogHours] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [savingPerms, setSavingPerms] = useState<string | null>(null)
  const [localPerms, setLocalPerms] = useState<Record<string, TeamMember['permissions']>>({})
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [tab, setTab] = useState<'hours' | 'members'>('hours')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setOwnerId(user.id)
    })
  }, [])

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() - 7)
    const w = d.toISOString().split('T')[0]; setWeekStart(w); fetchHours(w)
  }

  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + 7)
    const w = d.toISOString().split('T')[0]; setWeekStart(w); fetchHours(w)
  }

  const getPerms = (member: TeamMember) => localPerms[member.id] ?? member.permissions

  const setPermField = (memberId: string, field: keyof TeamMember['permissions'], value: boolean) => {
    const current = localPerms[memberId] ?? members.find(m => m.id === memberId)!.permissions
    setLocalPerms(prev => ({ ...prev, [memberId]: { ...current, [field]: value } }))
  }

  const savePerms = async (memberId: string) => {
    const perms = localPerms[memberId]; if (!perms) return
    setSavingPerms(memberId)
    try {
      await updatePermissions(memberId, perms)
      setLocalPerms(prev => { const n = { ...prev }; delete n[memberId]; return n })
    } finally { setSavingPerms(null) }
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDates = days.map((_, i) => {
    const d = new Date(weekStart + 'T12:00:00'); d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const memberHours = members.map(member => {
    const manualEntries = hoursLog.filter(h => h.team_member_id === member.id)
    const clockEntries = timeEntries.filter(e => e.team_member_id === member.id && e.clock_out)
    const manualTotal = manualEntries.reduce((s, h) => s + h.hours, 0)
    const clockTotal = clockEntries.reduce((s, e) => s + (e.hours ?? 0), 0)
    return { member, manualEntries, clockEntries, total: manualTotal + clockTotal }
  })

  const totalHoursThisWeek = memberHours.reduce((s, m) => s + m.total, 0)

  function formatTs(ts: string) {
    return new Date(ts).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <AppShell>
      <TopHeader
        title="Team"
        subtitle={`${members.length} active member${members.length !== 1 ? 's' : ''}`}
        action={<Button size="sm" onClick={() => setShowInvite(true)}><Plus className="w-3.5 h-3.5" />Invite</Button>}
      />

      <PageContainer>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
          {(['hours', 'members'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'hours' ? '⏱ Hours' : '👥 Members'}
            </button>
          ))}
        </div>

        {loading ? <PageSkeleton /> : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : (
          <>
            {tab === 'hours' && (
              <div>
                {members.length === 0 ? (
                  <EmptyState icon={Clock} title="No team members yet"
                    description="Invite a helper first." actionLabel="Invite" onAction={() => setShowInvite(true)} />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={prevWeek} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-900">{formatWeekLabel(weekStart)}</p>
                        <p className="text-xs text-slate-400">{formatHours(totalHoursThisWeek)} total</p>
                      </div>
                      <button onClick={nextWeek} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 mb-4">
                      {memberHours.map(({ member, manualEntries, clockEntries, total }) => (
                        <Card key={member.id} className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-teal-600">
                                {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-[15px]">{member.full_name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-400">{!member.invite_accepted ? '⏳ Pending' : '✓ Active'}</p>
                                {member.permissions.can_clock_self
                                  ? <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">Self-clocking</span>
                                  : <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Owner tracks</span>
                                }
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xl font-semibold text-teal-600">{formatHours(total)}</p>
                              <p className="text-[10px] text-slate-400">hrs this week</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDates.map((date, i) => {
                              const dayManual = manualEntries.filter(e => e.work_date === date).reduce((s, e) => s + e.hours, 0)
                              const dayClock = clockEntries.filter(e => e.work_date === date).reduce((s, e) => s + (e.hours ?? 0), 0)
                              const dayHours = dayManual + dayClock
                              return (
                                <div key={date} className="text-center">
                                  <p className="text-[10px] text-slate-400 mb-1">{days[i]}</p>
                                  <div className={`text-xs font-medium rounded-lg py-1 ${dayHours > 0 ? 'bg-teal-50 text-teal-700' : 'text-slate-300'}`}>
                                    {dayHours > 0 ? formatHours(dayHours) : '–'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <MemberClockCard
                            member={member}
                            ownerId={ownerId}
                            timeEntries={timeEntries}
                            onRefresh={() => fetchHours(weekStart)}
                          />

                          {(clockEntries.length > 0 || manualEntries.length > 0) && (
                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                              {clockEntries.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between text-xs text-slate-500 py-0.5">
                                  <span>{new Date(entry.work_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                  <span>{formatTs(entry.clock_in)} → {entry.clock_out ? formatTs(entry.clock_out) : '…'}</span>
                                  <span className="font-medium text-teal-600">{formatHours(entry.hours)}</span>
                                  <button onClick={() => deleteTimeEntry(entry.id)} className="text-slate-200 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                              {manualEntries.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between text-xs text-slate-500 py-0.5">
                                  <span>{new Date(entry.work_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                  <span className="text-slate-400 italic">manual</span>
                                  <span className="font-medium text-slate-600">{formatHours(entry.hours)}</span>
                                  <button onClick={() => deleteHours(entry.id)} className="text-slate-200 hover:text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>

                    <Button size="lg" variant="secondary" className="w-full" onClick={() => setShowLogHours(true)}>
                      <Clock className="w-4 h-4" /> Log hours manually
                    </Button>
                  </>
                )}
              </div>
            )}

            {tab === 'members' && (
              <div>
                {members.length === 0 ? (
                  <EmptyState icon={Users} title="No team members yet"
                    description="Invite a helper to give them access to their schedule and hours."
                    actionLabel="Invite first member" onAction={() => setShowInvite(true)} />
                ) : (
                  <div className="space-y-3">
                    {members.map(member => {
                      const isExpanded = expandedMember === member.id
                      const perms = getPerms(member)
                      const hasChanges = !!localPerms[member.id]

                      return (
                        <Card key={member.id}>
                          <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedMember(isExpanded ? null : member.id)}>
                            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-teal-600">
                                {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {member.invite_accepted ? <Badge variant="green">Active</Badge> : <Badge variant="amber">Pending</Badge>}
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">⏱ Hours tracking</p>
                                <PermRow label="Can clock in/out themselves" sub="Helper sees Clock in/Clock out buttons" checked={perms.can_clock_self} onChange={v => setPermField(member.id, 'can_clock_self', v)} />
                                <PermRow label="Can view own hours" sub="Helper can see their logged hours" checked={perms.view_own_hours} onChange={v => setPermField(member.id, 'view_own_hours', v)} />
                              </div>

                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Schedule</p>
                              <PermRow label="View today's jobs" sub="See assigned jobs for the day" checked={perms.view_today} onChange={v => setPermField(member.id, 'view_today', v)} />
                              <PermRow label="View upcoming schedule" checked={perms.view_schedule} onChange={v => setPermField(member.id, 'view_schedule', v)} />
                              <PermRow label="Mark job as done" checked={perms.mark_job_done} onChange={v => setPermField(member.id, 'mark_job_done', v)} />

                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3 mb-2">Clients</p>
                              <PermRow label="View job address" checked={perms.view_address} onChange={v => setPermField(member.id, 'view_address', v)} />
                              <PermRow label="View client contact info" sub="Phone and email" checked={perms.view_contact_info} onChange={v => setPermField(member.id, 'view_contact_info', v)} />
                              <PermRow label="View job notes" checked={perms.view_job_notes} onChange={v => setPermField(member.id, 'view_job_notes', v)} />

                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3 mb-2">Financial</p>
                              <PermRow label="View job price" checked={perms.view_job_price} onChange={v => setPermField(member.id, 'view_job_price', v)} />
                              <PermRow label="View invoices" checked={perms.view_invoices} onChange={v => setPermField(member.id, 'view_invoices', v)} />
                              <PermRow label="View expenses" checked={perms.view_expenses} onChange={v => setPermField(member.id, 'view_expenses', v)} />

                              <div className="flex gap-2 mt-4">
                                {hasChanges && (
                                  <Button size="sm" className="flex-1" loading={savingPerms === member.id} onClick={() => savePerms(member.id)}>
                                    <Check className="w-3.5 h-3.5" /> Save
                                  </Button>
                                )}
                                <Button size="sm" variant="danger" onClick={() => {
                                  if (confirm(`Remove ${member.full_name}?`)) deactivateMember(member.id)
                                }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </PageContainer>

      {showInvite && <InviteForm onInvite={inviteMember} onClose={() => setShowInvite(false)} />}
      {showLogHours && (
        <LogHoursForm members={members} onLog={async (memberId, hours, date, notes) => {
          await logHours({ team_member_id: memberId, hours, work_date: date, notes })
        }} onClose={() => setShowLogHours(false)} />
      )}
    </AppShell>
  )
}










