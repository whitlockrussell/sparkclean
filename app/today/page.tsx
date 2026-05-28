'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useClients } from '@/lib/hooks/useClients'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign, CalendarDays, Clock, Plus, MapPin, TrendingUp,
} from 'lucide-react'
import type { Appointment, NewAppointment } from '@/lib/types'

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TodayPage() {
  const { addAppointment, markDone, fetchToday } = useAppointments()
  const { clients } = useClients()
  const [todayJobs, setTodayJobs] = useState<Appointment[]>([])
  const [unpaidTotal, setUnpaidTotal] = useState(0)
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [weekIncome, setWeekIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Calculate this week's Mon–Sun range
      const now = new Date()
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekStart = monday.toISOString().split('T')[0]
      const weekEnd = sunday.toISOString().split('T')[0]

      const [jobs, invoices, weekJobs] = await Promise.all([
        fetchToday(),
        supabase
          .from('invoices')
          .select('total')
          .in('status', ['sent', 'overdue']),
        supabase
          .from('appointments')
          .select('price')
          .eq('status', 'completed')
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
      ])

      setTodayJobs(jobs)
      const inv = invoices.data ?? []
      setUnpaidCount(inv.length)
      setUnpaidTotal(inv.reduce((s, i) => s + i.total, 0))
      const wj = weekJobs.data ?? []
      setWeekIncome(wj.reduce((s, j) => s + j.price, 0))
      setLoading(false)
    }
    load()
  }, [])

  const handleAdd = async (data: NewAppointment) => {
    await addAppointment(data)
    const jobs = await fetchToday()
    setTodayJobs(jobs)
  }

  const handleMarkDone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await markDone(id)
    const jobs = await fetchToday()
    setTodayJobs(jobs)

    // Refresh week income after marking done
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const weekJobs = await supabase
      .from('appointments')
      .select('price')
      .eq('status', 'completed')
      .gte('scheduled_date', monday.toISOString().split('T')[0])
      .lte('scheduled_date', sunday.toISOString().split('T')[0])
    const wj = weekJobs.data ?? []
    setWeekIncome(wj.reduce((s, j) => s + j.price, 0))
  }

  const upcomingJobs = todayJobs.filter(j => j.status !== 'completed')
  const doneJobs = todayJobs.filter(j => j.status === 'completed')

  return (
    <AppShell>
      <TopHeader
        title={getGreeting()}
        subtitle={today}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            New job
          </Button>
        }
      />

      <PageContainer>
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard
                label="Today's jobs"
                value={String(todayJobs.length)}
                icon={CalendarDays}
                accent="teal"
                sub={`${upcomingJobs.length} upcoming`}
              />
              <StatCard
                label="Money owed"
                value={unpaidTotal > 0 ? `$${unpaidTotal.toFixed(0)}` : '$0'}
                icon={DollarSign}
                accent={unpaidTotal > 0 ? 'amber' : 'slate'}
                sub={unpaidCount > 0 ? `${unpaidCount} invoice${unpaidCount !== 1 ? 's' : ''}` : 'All paid up'}
              />
              <StatCard
                label="This week's income"
                value={`$${weekIncome.toFixed(0)}`}
                icon={TrendingUp}
                accent={weekIncome > 0 ? 'teal' : 'slate'}
                sub="Completed jobs"
              />
            </div>

            {/* Today's jobs */}
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Today's jobs
            </h2>

            {todayJobs.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No jobs today"
                description="Enjoy the day off, or add a new job."
                actionLabel="Add a job"
                onAction={() => setShowForm(true)}
              />
            ) : (
              <div className="space-y-3">
                {[...upcomingJobs, ...doneJobs].map(job => {
                  const client = job.clients
                  const name = client
                    ? `${client.first_name} ${client.last_name}`
                    : 'Unknown client'
                  const address = client?.address ?? null
                  const isDone = job.status === 'completed'

                  return (
                    <Card key={job.id} className={`p-4 ${isDone ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 text-[15px] truncate">
                              {name}
                            </p>
                            {isDone
                              ? <Badge variant="green">Done</Badge>
                              : <Badge variant="teal">Upcoming</Badge>
                            }
                          </div>
                          {address && (
                            <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} />
                              <span className="truncate">{address}</span>
                            </div>
                          )}
                          {job.start_time && (
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" strokeWidth={1.8} />
                                {formatTime(job.start_time)}
                              </span>
                              {job.duration_hours && (
                                <><span>·</span><span>{job.duration_hours} hrs</span></>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-lg font-semibold text-amber-600">
                            ${job.price.toFixed(0)}
                          </p>
                          {!isDone && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-2"
                              onClick={(e) => handleMarkDone(e, job.id)}
                            >
                              Done
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </PageContainer>

      {showForm && (
        <AppointmentForm
          clients={clients}
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppShell>
  )
}
