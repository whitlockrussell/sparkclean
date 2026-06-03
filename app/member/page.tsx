'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, Clock, MapPin, LogOut } from 'lucide-react'
import { PhoneLink } from '@/components/ui/PhoneLink'

type MemberPermissions = {
  view_today: boolean
  view_schedule: boolean
  mark_job_done: boolean
  view_address: boolean
  view_contact_info: boolean
  view_job_notes: boolean
  view_own_hours: boolean
  view_job_price: boolean
  can_clock_self: boolean
  can_edit_hours: boolean
}

type Job = {
  id: string
  scheduled_date: string
  start_time: string | null
  duration_hours: number | null
  price: number
  status: string
  notes: string | null
  clients: {
    first_name: string
    last_name: string
    address: string | null
    city: string | null
    phone: string | null
    email: string | null
  } | null
}

type TimeEntry = {
  id: string
  clock_in: string
  clock_out: string | null
  hours: number | null
  work_date: string
}

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function MemberDashboard() {
  const [permissions, setPermissions] = useState<MemberPermissions | null>(null)
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [memberName, setMemberName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [loading, setLoading] = useState(true)


  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [clockLoading, setClockLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!member) return
      setPermissions(member.permissions)
      setMemberName(member.full_name)
      setMemberId(member.id)
      setOwnerId(member.owner_id)

      const today = new Date().toISOString().split('T')[0]

      const { data: assignments } = await supabase
        .from('appointment_assignments')
        .select('appointment_id')
        .eq('team_member_id', member.id)

      const appointmentIds = assignments?.map(a => a.appointment_id) ?? []

      if (appointmentIds.length > 0) {
        const { data: allJobs } = await supabase
          .from('appointments')
          .select('*, clients(first_name, last_name, address, city, phone, email)')
          .in('id', appointmentIds)
          .neq('status', 'cancelled')
          .order('scheduled_date', { ascending: true })

        const jobs = allJobs ?? []
        setTodayJobs(jobs.filter(j => j.scheduled_date === today))
        setUpcomingJobs(jobs.filter(j => j.scheduled_date > today).slice(0, 5))
      }

      if (member.permissions.view_own_hours) {
        const { data: entries } = await supabase
          .from('time_entries')
          .select('*')
          .eq('team_member_id', member.id)
          .eq('work_date', today)
          .order('clock_in', { ascending: true })

        const todayEnts = entries ?? []
        setTodayEntries(todayEnts)

        const open = todayEnts.find(e => !e.clock_out)
        if (open) {
          setActiveEntry(open)
          const secs = Math.floor((Date.now() - new Date(open.clock_in).getTime()) / 1000)
          setElapsed(secs)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (activeEntry) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeEntry])

  const handleClockIn = async () => {
    if (!permissions?.can_clock_self) return
    setClockLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          owner_id: ownerId,
          team_member_id: memberId,
          clock_in: new Date().toISOString(),
          work_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single()

      if (error) throw error
      setActiveEntry(data)
      setElapsed(0)
      setTodayEntries(prev => [...prev, data])
    } catch (err) {
      console.error('Clock in error:', err)
    } finally {
      setClockLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeEntry || !permissions?.can_clock_self) return
    setClockLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeEntry.id)
        .select()
        .single()

      if (error) throw error
      setActiveEntry(null)
      setElapsed(0)
      setTodayEntries(prev => prev.map(e => e.id === data.id ? data : e))
    } catch (err) {
      console.error('Clock out error:', err)
    } finally {
      setClockLoading(false)
    }
  }

  const handleToggleStatus = async (jobId: string, newStatus: 'scheduled' | 'completed') => {
    setTodayJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    await supabase.from('appointments').update({ status: newStatus }).eq('id', jobId)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const todayTotalHours = todayEntries
    .filter(e => e.hours !== null)
    .reduce((s, e) => s + (e.hours ?? 0), 0)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!permissions) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <p className="text-slate-400 dark:text-slate-500 text-sm text-center">Your account isn't linked to a team yet.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{greeting()}, {memberName.split(' ')[0]} 👋</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
              <span className="text-sm font-semibold text-teal-600">
                {memberName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <button onClick={handleSignOut} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">

        {/* Clock in/out — only shown if owner has enabled self-clocking */}
        {permissions.view_own_hours && (
          <div>
            {permissions.can_clock_self ? (
              /* Self-clocking enabled */
              activeEntry ? (
                <div className="bg-teal-500 rounded-2xl p-5 text-white text-center">
                  <p className="text-sm font-medium opacity-80 mb-1">You're clocked in</p>
                  <p className="text-4xl font-semibold tracking-tight mb-1 font-mono">{formatElapsed(elapsed)}</p>
                  <p className="text-xs opacity-70 mb-4">Since {formatTimestamp(activeEntry.clock_in)}</p>
                  <button onClick={handleClockOut} disabled={clockLoading}
                    className="w-full bg-white text-teal-600 font-semibold py-3 rounded-xl text-sm hover:bg-teal-50 transition-colors disabled:opacity-50">
                    {clockLoading ? 'Clocking out…' : '⏹ Clock out'}
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-7 h-7 text-teal-500" strokeWidth={1.8} />
                  </div>
                  {todayTotalHours > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Total today: <span className="font-semibold text-teal-600">{todayTotalHours.toFixed(2)} hrs</span>
                    </p>
                  )}
                  <button onClick={handleClockIn} disabled={clockLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 mt-3">
                    {clockLoading ? 'Clocking in…' : '▶ Clock in'}
                  </button>
                </div>
              )
            ) : (
              /* Owner controls hours — read-only view for helper */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-teal-500" strokeWidth={1.8} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your hours today</p>
                </div>
                {todayEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">No hours logged yet today. Your employer tracks your hours.</p>
                ) : (
                  <div className="space-y-1">
                    {todayEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <span>
                          {formatTimestamp(entry.clock_in)}
                          {entry.clock_out ? ` → ${formatTimestamp(entry.clock_out)}` : ' → ongoing'}
                        </span>
                        <span className="font-medium text-teal-600">
                          {entry.hours ? `${entry.hours.toFixed(2)} hrs` : 'In progress'}
                        </span>
                      </div>
                    ))}
                    {todayTotalHours > 0 && (
                      <p className="text-xs font-semibold text-teal-600 pt-1">Total: {todayTotalHours.toFixed(2)} hrs</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Today's jobs */}
        {permissions.view_today && (
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Today's jobs</p>
            {todayJobs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center">
                <CalendarDays className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-slate-400 dark:text-slate-500">No jobs scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayJobs.map(job => {
                  const isDone = job.status === 'completed' || job.status === 'payment_received'
                  const isPaid = job.status === 'payment_received'
                  const client = job.clients
                  return (
                    <div key={job.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 ${isDone ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {permissions.view_address && client?.address && (
                            <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white mb-1">
                              <MapPin className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" strokeWidth={2} />
                              <span className="truncate">{client.address}{client.city ? `, ${client.city}` : ''}</span>
                            </div>
                          )}
                          {permissions.view_contact_info && client && (
                            <div className="mb-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400">{client.first_name} {client.last_name}</p>
                              {client.phone && <PhoneLink phone={client.phone} className="mt-0.5" />}
                            </div>
                          )}
                          {job.start_time && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                              <Clock className="w-3 h-3" strokeWidth={1.8} />
                              <span>{formatTime(job.start_time)}</span>
                              {job.duration_hours && <span>· {job.duration_hours} hrs</span>}
                            </div>
                          )}
                          {permissions.view_job_notes && job.notes && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1">{job.notes}</p>
                          )}
                        </div>
                        {permissions.view_job_price && (
                          <p className={`text-base font-semibold flex-shrink-0 ${job.price === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-amber-600'}`}>{job.price === 0 ? 'TBD' : `$${job.price}`}</p>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center py-1.5 gap-3">
                          <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">Job done</p>
                          <button
                            type="button"
                            disabled={!permissions.mark_job_done}
                            onClick={() => handleToggleStatus(job.id, isDone ? 'scheduled' : 'completed')}
                            className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isDone ? 'bg-teal-500' : 'bg-slate-300'} disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDone ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center py-1.5 gap-3">
                          <p className="text-sm flex-1 text-slate-400 dark:text-slate-500">Payment received</p>
                          <button
                            type="button"
                            disabled
                            className={`w-10 h-[22px] rounded-full relative flex-shrink-0 opacity-40 cursor-not-allowed ${isPaid ? 'bg-teal-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm ${isPaid ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming */}
        {permissions.view_schedule && upcomingJobs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Upcoming</p>
            <div className="space-y-2">
              {upcomingJobs.map(job => {
                const client = job.clients
                return (
                  <div key={job.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {job.start_time && ` · ${formatTime(job.start_time)}`}
                      </p>
                      {permissions.view_address && client?.address && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{client.address}</p>
                      )}
                    </div>
                    {job.duration_hours && <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{job.duration_hours} hrs</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
