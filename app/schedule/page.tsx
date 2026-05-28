'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useClients } from '@/lib/hooks/useClients'
import {
  CalendarDays, Plus, Clock, MapPin, RefreshCw, ChevronRight
} from 'lucide-react'
import type { Appointment, NewAppointment } from '@/lib/types'

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

  return date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(time: string | null) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function groupByDate(appointments: Appointment[]) {
  return appointments.reduce((groups, appt) => {
    const date = appt.scheduled_date
    if (!groups[date]) groups[date] = []
    groups[date].push(appt)
    return groups
  }, {} as Record<string, Appointment[]>)
}

export default function SchedulePage() {
  const { appointments, loading, error, addAppointment, updateAppointment, markDone, cancelAppointment } = useAppointments()
  const { clients } = useClients()
  const [showForm, setShowForm] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>()

  const grouped = groupByDate(appointments)
  const sortedDates = Object.keys(grouped).sort()

  const handleAdd = async (data: NewAppointment) => {
    await addAppointment(data)
  }

  const handleEdit = async (data: NewAppointment) => {
    if (editingAppt) await updateAppointment(editingAppt.id, data)
  }

  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingAppt(undefined)
  }

  const handleMarkDone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await markDone(id)
  }

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Cancel this job?')) await cancelAppointment(id)
  }

  return (
    <AppShell>
      <TopHeader
        title="Schedule"
        subtitle={loading ? '' : `${appointments.length} upcoming job${appointments.length !== 1 ? 's' : ''}`}
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Book job
          </Button>
        }
      />

      <PageContainer>
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming jobs"
            description="Book a recurring or one-off cleaning job for any of your clients."
            actionLabel="Book first job"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {formatDate(date)}
                  </p>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">
                    {grouped[date].length} job{grouped[date].length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {grouped[date].map(appt => {
                    const client = appt.clients
                    const name = client
                      ? `${client.first_name} ${client.last_name}`
                      : 'Unknown client'
                    const address = client?.address
                      ? `${client.address}${client.city ? ', ' + client.city : ''}`
                      : null
                    const isDone = appt.status === 'completed'

                    return (
                      <Card
                        key={appt.id}
                        className={`p-4 ${isDone ? 'opacity-60' : ''}`}
                        onClick={() => openEdit(appt)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-slate-900 text-[15px]">{name}</p>
                              {isDone && <Badge variant="green">Done</Badge>}
                              {appt.is_recurring && (
                                <Badge variant="teal">
                                  <RefreshCw className="w-2.5 h-2.5 mr-1" />
                                  {appt.recurrence_rule}
                                </Badge>
                              )}
                            </div>

                            {address && (
                              <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} />
                                <span className="truncate">{address}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {appt.start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" strokeWidth={1.8} />
                                  {formatTime(appt.start_time)}
                                </span>
                              )}
                              {appt.duration_hours && (
                                <>
                                  <span>·</span>
                                  <span>{appt.duration_hours} hrs</span>
                                </>
                              )}
                            </div>

                            {appt.notes && (
                              <p className="text-xs text-slate-400 mt-1.5 truncate">{appt.notes}</p>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
                            <p className="text-lg font-semibold text-amber-600">
                              ${appt.price.toFixed(0)}
                            </p>
                            {!isDone ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => handleMarkDone(e, appt.id)}
                              >
                                Mark done
                              </Button>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>

      {showForm && (
        <AppointmentForm
          clients={clients}
          appointment={editingAppt}
          onSave={editingAppt ? handleEdit : handleAdd}
          onClose={closeForm}
        />
      )}
    </AppShell>
  )
}
