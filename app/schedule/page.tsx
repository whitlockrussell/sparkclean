'use client'

import { useState } from 'react'
import {
  DndContext, DragEndEvent,
  PointerSensor, TouchSensor, useDroppable, useDraggable,
  useSensors, useSensor,
} from '@dnd-kit/core'
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
  CalendarDays, Plus, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import type { Appointment, NewAppointment } from '@/lib/types'

// ── date helpers — all local-time, never toISOString() ───────────────────────

function localStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekStart(): string {
  const now = new Date()
  const dow = now.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow === 0 ? 6 : dow - 1))
  return localStr(monday)
}

function getWeekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => localStr(new Date(y, m - 1, d + i)))
}

function shiftWeek(weekStart: string, delta: number): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  return localStr(new Date(y, m - 1, d + delta))
}

function formatWeekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end   = new Date(y, m - 1, d + 6)
  const s = start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const e = end.toLocaleDateString('en-CA',   { month: 'short', day: 'numeric' })
  return `${s} – ${e}`
}

function todayLocalStr(): string {
  return localStr(new Date())
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const t = todayLocalStr()
  const [ty, tm, td] = t.split('-').map(Number)
  const tomorrow = localStr(new Date(ty, tm - 1, td + 1))
  if (dateStr === t) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
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

// ── week-view sub-components ──────────────────────────────────────────────────

function WeekJobCard({ appt, onTap }: { appt: Appointment; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: appt.id })
  const client = appt.clients
  const name = client ? client.first_name : '?'
  const isDone = appt.status === 'completed' || appt.status === 'payment_received'
  const isPaid = appt.status === 'payment_received'

  const cardClass = isPaid
    ? 'bg-green-50 border-green-200'
    : isDone
    ? 'bg-slate-100 border-slate-200'
    : 'bg-teal-50 border-teal-200'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onTap}
      className={`rounded-lg px-1.5 py-1 border cursor-grab active:cursor-grabbing touch-none select-none transition-opacity
        ${cardClass} ${isDragging ? 'opacity-20' : isDone ? 'opacity-60' : 'opacity-100'}`}
    >
      <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{name}</p>
      {appt.start_time && (
        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{formatTime(appt.start_time)}</p>
      )}
    </div>
  )
}

function DayColumn({ date, children }: { date: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: date })
  return (
    <div
      ref={setNodeRef}
      className={`space-y-1.5 min-h-[48px] rounded-lg p-1 -m-1 transition-colors ${isOver ? 'bg-teal-50 ring-1 ring-teal-300' : ''}`}
    >
      {children}
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { appointments, loading, error, addAppointment, updateAppointment, deleteAppointment } = useAppointments()
  const { clients } = useClients()
  const { createInvoice } = useInvoices()

  const [view, setView] = useState<'list' | 'week'>('list')
  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [showForm, setShowForm] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>()
  const [invoiceAppt, setInvoiceAppt] = useState<Appointment | undefined>()
  const [pendingReschedule, setPendingReschedule] = useState<{ apptId: string; newDate: string } | null>(null)
  const [newTime, setNewTime] = useState('')

  const today = todayLocalStr()
  const weekDates = getWeekDates(weekStart)
  const grouped = groupByDate(appointments)
  const sortedDates = Object.keys(grouped).sort()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const handleAdd = async (data: NewAppointment) => { await addAppointment(data) }
  const handleEdit = async (data: NewAppointment) => { if (editingAppt) await updateAppointment(editingAppt.id, data) }
  const handleDelete = async () => { if (editingAppt) await deleteAppointment(editingAppt.id) }
  const openEdit = (appt: Appointment) => { setEditingAppt(appt); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingAppt(undefined) }

  const handleToggleStatus = async (id: string, newStatus: 'scheduled' | 'completed' | 'payment_received') => {
    await updateAppointment(id, { status: newStatus })
  }
  const handleCreateInvoice = async (data: NewInvoice) => { await createInvoice(data) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const appt = appointments.find(a => a.id === active.id)
    if (!appt || appt.scheduled_date === over.id) return
    setPendingReschedule({ apptId: appt.id, newDate: over.id as string })
    setNewTime(appt.start_time ?? '')
  }

  const confirmReschedule = async () => {
    if (!pendingReschedule) return
    await updateAppointment(pendingReschedule.apptId, {
      scheduled_date: pendingReschedule.newDate,
      start_time: newTime || null,
    })
    setPendingReschedule(null)
  }

  const renderCard = (appt: Appointment) => {
    const client = appt.clients
    const name = client ? `${client.first_name} ${client.last_name}` : 'Unknown client'
    const address = client?.address ? `${client.address}${client.city ? ', ' + client.city : ''}` : null
    const isDone = appt.status === 'completed' || appt.status === 'payment_received'
    const isPaid = appt.status === 'payment_received'

    return (
      <Card key={appt.id} className={`p-4 ${appt.status !== 'scheduled' ? 'opacity-60' : ''}`} onClick={() => openEdit(appt)}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p className="font-semibold text-slate-900 text-[15px]">{name}</p>
            {appt.is_recurring && <Badge variant="teal"><RefreshCw className="w-2.5 h-2.5 mr-1" />{appt.recurrence_rule}</Badge>}
          </div>
          <p className="text-lg font-semibold text-amber-600 flex-shrink-0">${appt.price.toFixed(0)}</p>
        </div>
        {address && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} /><span className="truncate">{address}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {appt.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.8} />{formatTime(appt.start_time)}</span>}
          {appt.duration_hours && <><span>·</span><span>{appt.duration_hours} hrs</span></>}
        </div>
        {appt.notes && <p className="text-xs text-slate-400 mt-1.5 truncate">{appt.notes}</p>}
        {client?.notes && <p className="text-xs text-slate-400 mt-1.5 italic truncate">{client.notes}</p>}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center py-1.5 gap-3">
            <p className="text-sm text-slate-700 flex-1">Job done</p>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(appt.id, isDone ? 'scheduled' : 'completed') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isDone ? 'bg-teal-500' : 'bg-slate-300'}`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDone ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center py-1.5 gap-3">
            <p className={`text-sm flex-1 ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>Payment received</p>
            <button type="button" disabled={!isDone}
              onClick={(e) => { e.stopPropagation(); handleToggleStatus(appt.id, isPaid ? 'completed' : 'payment_received') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isPaid ? 'bg-teal-500' : 'bg-slate-300'} disabled:opacity-40 disabled:cursor-not-allowed`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {isPaid && (
            <button type="button" onClick={(e) => { e.stopPropagation(); setInvoiceAppt(appt) }}
              className="mt-1 w-full text-xs font-medium text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-xl py-2 transition-colors">
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
        action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" />Book job</Button>}
      />

      <PageContainer>
        {loading ? <PageSkeleton /> : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
              {(['list', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v === 'list' ? '≡ List' : '📅 Week'}
                </button>
              ))}
            </div>

            {view === 'list' ? (
              appointments.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No upcoming jobs"
                  description="Book a recurring or one-off cleaning job for any of your clients."
                  actionLabel="Book first job" onAction={() => setShowForm(true)} />
              ) : (
                <div className="space-y-6">
                  {sortedDates.map(date => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{formatDate(date)}</p>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">{grouped[date].length} job{grouped[date].length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-3">{grouped[date].map(appt => renderCard(appt))}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── Week view ── */
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setWeekStart(shiftWeek(weekStart, -7))}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-slate-900">{formatWeekLabel(weekStart)}</p>
                  <button onClick={() => setWeekStart(shiftWeek(weekStart, 7))}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 px-4 pb-4">
                  <div className="min-w-[560px]">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2 pb-3 border-b border-slate-100">
                      {weekDates.map(date => {
                        const isToday = date === today
                        const [dy, dm, dd] = date.split('-').map(Number)
                        const d = new Date(dy, dm - 1, dd)
                        return (
                          <div key={date} className="text-center">
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-teal-500' : 'text-slate-400'}`}>
                              {d.toLocaleDateString('en-CA', { weekday: 'short' })}
                            </p>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-teal-500' : ''}`}>
                              <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-600'}`}>{d.getDate()}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Job columns */}
                    <div className="grid grid-cols-7 gap-1.5 items-start">
                      {weekDates.map(date => {
                        const dayJobs = (grouped[date] ?? []).slice().sort((a, b) =>
                          (a.start_time ?? '').localeCompare(b.start_time ?? '')
                        )
                        return (
                          <DayColumn key={date} date={date}>
                            {dayJobs.length === 0
                              ? <div className="h-0.5 rounded bg-slate-100 mt-2" />
                              : dayJobs.map(appt => (
                                <WeekJobCard key={appt.id} appt={appt} onTap={() => openEdit(appt)} />
                              ))
                            }
                          </DayColumn>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </DndContext>
            )}
          </>
        )}
      </PageContainer>

      {/* Reschedule time prompt */}
      {pendingReschedule && (() => {
        const [dy, dm, dd] = pendingReschedule.newDate.split('-').map(Number)
        const label = new Date(dy, dm - 1, dd).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="bg-white rounded-2xl p-5 w-[320px] mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[15px] font-semibold text-slate-900">Move job</h3>
                <button onClick={() => setPendingReschedule(null)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">Moving to {label}</p>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start time (optional)</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              <div className="flex gap-3 mt-4">
                <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={() => setPendingReschedule(null)}>Cancel</Button>
                <Button type="button" size="lg" className="flex-1" onClick={confirmReschedule}>Move job</Button>
              </div>
            </div>
          </div>
        )
      })()}

      {showForm && (
        <AppointmentForm clients={clients} appointment={editingAppt}
          onSave={editingAppt ? handleEdit : handleAdd} onClose={closeForm}
          onDelete={editingAppt ? handleDelete : undefined} />
      )}
      {invoiceAppt && (
        <InvoiceForm clients={clients}
          initialClientId={invoiceAppt.client_id} initialAppointmentId={invoiceAppt.id}
          initialItems={[{ description: 'Home cleaning', quantity: 1, unit_price: invoiceAppt.price }]}
          onSave={handleCreateInvoice} onClose={() => setInvoiceAppt(undefined)} />
      )}
    </AppShell>
  )
}
