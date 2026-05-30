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
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useClients } from '@/lib/hooks/useClients'
import { useInvoices } from '@/lib/hooks/useInvoices'
import type { NewInvoice } from '@/lib/hooks/useInvoices'
import {
  CalendarDays, Plus, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'
import type { Appointment, NewAppointment } from '@/lib/types'

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const s = start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const e = end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  return `${s} – ${e}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
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
  const { appointments, loading, error, addAppointment, updateAppointment, deleteAppointment } = useAppointments()
  const { clients } = useClients()
  const { createInvoice } = useInvoices()
  const [view, setView] = useState<'list' | 'week'>('list')
  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [showForm, setShowForm] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>()
  const [invoiceAppt, setInvoiceAppt] = useState<Appointment | undefined>()

  const today = new Date().toISOString().split('T')[0]
  const weekDates = getWeekDates(weekStart)
  const grouped = groupByDate(appointments)
  const sortedDates = Object.keys(grouped).sort()

  const handleAdd = async (data: NewAppointment) => { await addAppointment(data) }
  const handleEdit = async (data: NewAppointment) => { if (editingAppt) await updateAppointment(editingAppt.id, data) }
  const handleDelete = async () => { if (editingAppt) await deleteAppointment(editingAppt.id) }
  const openEdit = (appt: Appointment) => { setEditingAppt(appt); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingAppt(undefined) }

  const handleToggleStatus = async (id: string, newStatus: 'scheduled' | 'completed' | 'payment_received') => {
    await updateAppointment(id, { status: newStatus })
  }

  const handleCreateInvoice = async (data: NewInvoice) => { await createInvoice(data) }

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const renderCard = (appt: Appointment) => {
    const client = appt.clients
    const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown client'
    const address = client?.address ? `${client.address}${client.city ? ', ' + client.city : ''}` : null
    const isDone = appt.status === 'completed' || appt.status === 'payment_received'
    const isPaid = appt.status === 'payment_received'

    return (
      <Card
        key={appt.id}
        className={`p-4 ${appt.status !== 'scheduled' ? 'opacity-60' : ''}`}
        onClick={() => openEdit(appt)}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p className="font-semibold text-slate-900 text-[15px]">{name}</p>
            {appt.is_recurring && (
              <Badge variant="teal">
                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                {appt.recurrence_rule}
              </Badge>
            )}
          </div>
          <p className="text-lg font-semibold text-amber-600 flex-shrink-0">${appt.price.toFixed(0)}</p>
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
          {appt.duration_hours && <><span>·</span><span>{appt.duration_hours} hrs</span></>}
        </div>

        {appt.notes && <p className="text-xs text-slate-400 mt-1.5 truncate">{appt.notes}</p>}
        {client?.notes && <p className="text-xs text-slate-400 mt-1.5 italic truncate">{client.notes}</p>}

        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center py-1.5 gap-3">
            <p className="text-sm text-slate-700 flex-1">Job done</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(appt.id, isDone ? 'scheduled' : 'completed') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isDone ? 'bg-teal-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDone ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center py-1.5 gap-3">
            <p className={`text-sm flex-1 ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>Payment received</p>
            <button
              type="button"
              disabled={!isDone}
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(appt.id, isPaid ? 'completed' : 'payment_received') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isPaid ? 'bg-teal-500' : 'bg-slate-300'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {isPaid && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setInvoiceAppt(appt) }}
              className="mt-1 w-full text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-xl py-2 transition-colors"
            >
              + Create invoice
            </button>
          )}
        </div>
      </Card>
    )
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
        ) : (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
              {(['list', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v === 'list' ? '≡ List' : '📅 Week'}
                </button>
              ))}
            </div>

            {view === 'list' ? (
              appointments.length === 0 ? (
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
                        {grouped[date].map(appt => renderCard(appt))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Week view */
              <div>
                {/* Week navigation */}
                <div className="flex items-center justify-between mb-5">
                  <button onClick={prevWeek}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-slate-900">{formatWeekLabel(weekStart)}</p>
                  <button onClick={nextWeek}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days */}
                <div className="space-y-5">
                  {weekDates.map(date => {
                    const dayJobs = (grouped[date] ?? []).slice().sort((a, b) =>
                      (a.start_time ?? '').localeCompare(b.start_time ?? '')
                    )
                    const isToday = date === today
                    const d = new Date(date + 'T12:00:00')
                    const dayShort = d.toLocaleDateString('en-CA', { weekday: 'short' })
                    const dayFull = d.toLocaleDateString('en-CA', { weekday: 'long' })
                    const dayNum = d.getDate()
                    const monthShort = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

                    return (
                      <div key={date}>
                        {/* Day header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-11 h-11 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${isToday ? 'bg-teal-500' : 'bg-slate-100'}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wide leading-none ${isToday ? 'text-teal-200' : 'text-slate-400'}`}>
                              {dayShort}
                            </span>
                            <span className={`text-base font-bold leading-tight ${isToday ? 'text-white' : 'text-slate-700'}`}>
                              {dayNum}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isToday ? 'text-teal-600' : 'text-slate-700'}`}>{dayFull}</p>
                            <p className="text-xs text-slate-400">{monthShort}</p>
                          </div>
                          {dayJobs.length > 0 && (
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
                              {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {dayJobs.length === 0 ? (
                          <div className="ml-14 py-2.5 px-3 border border-dashed border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-300">No jobs scheduled</p>
                          </div>
                        ) : (
                          <div className="ml-14 space-y-3">
                            {dayJobs.map(appt => renderCard(appt))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </PageContainer>

      {showForm && (
        <AppointmentForm
          clients={clients}
          appointment={editingAppt}
          onSave={editingAppt ? handleEdit : handleAdd}
          onClose={closeForm}
          onDelete={editingAppt ? handleDelete : undefined}
        />
      )}
      {invoiceAppt && (
        <InvoiceForm
          clients={clients}
          initialClientId={invoiceAppt.client_id}
          initialAppointmentId={invoiceAppt.id}
          initialItems={[{ description: 'Home cleaning', quantity: 1, unit_price: invoiceAppt.price }]}
          onSave={handleCreateInvoice}
          onClose={() => setInvoiceAppt(undefined)}
        />
      )}
    </AppShell>
  )
}
