'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useClients } from '@/lib/hooks/useClients'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, Clock, Plus, MapPin, TrendingUp,
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

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
}

export default function TodayPage() {
  const { addAppointment, updateAppointment, fetchToday, fetchUnpaid } = useAppointments()
  const { clients } = useClients()
  const [todayJobs, setTodayJobs] = useState<Appointment[]>([])
  const [unpaidJobs, setUnpaidJobs] = useState<Appointment[]>([])
  const [weekIncome, setWeekIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const refresh = async () => {
    const { weekStart, weekEnd } = getWeekRange()
    const [jobs, unpaid, weekJobs] = await Promise.all([
      fetchToday(),
      fetchUnpaid(),
      supabase
        .from('appointments')
        .select('price')
        .eq('status', 'payment_received')
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd),
    ])
    setTodayJobs(jobs)
    setUnpaidJobs(unpaid)
    setWeekIncome((weekJobs.data ?? []).reduce((s, j) => s + j.price, 0))
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      await refresh()
      setLoading(false)
    }
    load()
  }, [])

  const handleAdd = async (data: NewAppointment) => {
    await addAppointment(data)
    await refresh()
  }

  const handleToggleStatus = async (id: string, newStatus: 'scheduled' | 'completed' | 'payment_received') => {
    await updateAppointment(id, { status: newStatus })
    await refresh()
  }

  const handleUnpaidJobPaid = async (id: string) => {
    await updateAppointment(id, { status: 'payment_received' })
    await refresh()
  }

  const scheduledJobs = todayJobs.filter(j => j.status === 'scheduled')
  const completedJobs = todayJobs.filter(j => j.status === 'completed')
  const paidJobs = todayJobs.filter(j => j.status === 'payment_received')
  const sortedTodayJobs = [...scheduledJobs, ...completedJobs, ...paidJobs]

  const unpaidTotal = unpaidJobs.reduce((s, j) => s + j.price, 0)

  return (
    <AppShell>
      <TopHeader
        title={getGreeting()}
        subtitle={todayLabel}
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
                sub={`${scheduledJobs.length} upcoming`}
              />
              <StatCard
                label="This week's income"
                value={`$${weekIncome.toFixed(0)}`}
                icon={TrendingUp}
                accent={weekIncome > 0 ? 'teal' : 'slate'}
                sub="Payment received"
              />
            </div>

            {/* Today's jobs */}
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Today&apos;s jobs
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
              <div className="space-y-3 mb-6">
                {sortedTodayJobs.map(job => {
                  const client = job.clients
                  const name = client
                    ? `${client.first_name} ${client.last_name}`
                    : 'Unknown client'
                  const address = client?.address ?? null
                  const isDone = job.status === 'completed' || job.status === 'payment_received'
                  const isPaid = job.status === 'payment_received'

                  return (
                    <Card key={job.id} className={`p-4 ${job.status !== 'scheduled' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="font-semibold text-slate-900 text-[15px] truncate">{name}</p>
                        <p className="text-lg font-semibold text-amber-600 flex-shrink-0">
                          ${job.price.toFixed(0)}
                        </p>
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
                      {client?.notes && (
                        <p className="text-xs text-slate-400 mt-1.5 italic truncate">{client.notes}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center py-1.5 gap-3">
                          <p className="text-sm text-slate-700 flex-1">Job done</p>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(job.id, isDone ? 'scheduled' : 'completed')}
                            className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isDone ? 'bg-teal-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDone ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center py-1.5 gap-3">
                          <p className="text-sm text-slate-700 flex-1">Payment received</p>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(job.id, isPaid ? 'completed' : 'payment_received')}
                            className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isPaid ? 'bg-teal-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Money Owed */}
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {unpaidTotal > 0
                ? `Money Owed · $${unpaidTotal.toFixed(0)}`
                : 'Money Owed'}
            </h2>

            {unpaidJobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">All jobs paid up</p>
            ) : (
              <div className="space-y-2">
                {unpaidJobs.map(job => {
                  const client = job.clients
                  const name = client
                    ? `${client.first_name} ${client.last_name}`
                    : 'Unknown client'
                  const isToday = job.scheduled_date === todayStr
                  return (
                    <Card
                      key={job.id}
                      className="p-3 cursor-pointer"
                      onClick={() => handleUnpaidJobPaid(job.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{name}</p>
                          {!isToday && (
                            <p className="text-xs text-slate-400">
                              {new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', {
                                weekday: 'short', month: 'short', day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="font-semibold text-amber-600">${job.price.toFixed(0)}</p>
                          <span className="text-xs text-teal-600 font-medium whitespace-nowrap">Mark paid →</span>
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
