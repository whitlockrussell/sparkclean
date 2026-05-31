'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext, DragEndEvent,
  PointerSensor, TouchSensor, useDroppable, useDraggable,
  useSensors, useSensor, pointerWithin, rectIntersection,
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
import { CalendarDays, Plus, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Appointment, NewAppointment } from '@/lib/types'

// ── calendar constants ────────────────────────────────────────────────────────

const HOUR_H = 60          // px per hour
const START_H = 7          // 7 AM
const END_H   = 19         // 7 PM
const TOTAL_H = (END_H - START_H) * HOUR_H   // 720px
const HOURS   = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── date helpers — local time only, never toISOString() ──────────────────────

function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayStr(): string { return localStr(new Date()) }
function getWeekStart(): string {
  const now = new Date()
  const dow = now.getDay()
  return localStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow === 0 ? 6 : dow - 1)))
}
function getWeekDates(ws: string): string[] {
  const [y, m, d] = ws.split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => localStr(new Date(y, m - 1, d + i)))
}
function getEndOfWeek(): string {
  const now = new Date()
  const dow = now.getDay()
  const daysToSunday = dow === 0 ? 0 : 7 - dow
  return localStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSunday))
}
function shiftWeek(ws: string, delta: number): string {
  const [y, m, d] = ws.split('-').map(Number)
  return localStr(new Date(y, m - 1, d + delta))
}
function formatWeekLabel(ws: string): string {
  const [y, m, d] = ws.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const e = new Date(y, m - 1, d + 6).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  return `${s} – ${e}`
}
function formatDate(ds: string): string {
  const [y, m, d] = ds.split('-').map(Number)
  const today = todayStr()
  const tomorrow = localStr(new Date(y, m - 1, d + 1))
  if (ds === today) return 'Today'
  if (ds === localStr(new Date(...today.split('-').map(Number) as [number, number, number]))) return 'Tomorrow'
  if (ds === tomorrow) return 'Tomorrow'
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function formatHourLabel(h: number): string {
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}
function fmtPrice(price: number): string {
  return price === 0 ? 'TBD' : `$${price.toFixed(0)}`
}

// ── calendar helpers ──────────────────────────────────────────────────────────

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return Math.max(0, (h * 60 + m - START_H * 60) / 60 * HOUR_H)
}
function yToTime(y: number): string {
  const raw = (y / HOUR_H) * 60 + START_H * 60
  const snapped = Math.round(raw / 30) * 30
  const clamped = Math.max(START_H * 60, Math.min(END_H * 60 - 30, snapped))
  const hh = Math.floor(clamped / 60), mm = clamped % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function groupByDate(appts: Appointment[]): Record<string, Appointment[]> {
  return appts.reduce((g, a) => {
    if (!g[a.scheduled_date]) g[a.scheduled_date] = []
    g[a.scheduled_date].push(a)
    return g
  }, {} as Record<string, Appointment[]>)
}

// ── week-view draggable job block ─────────────────────────────────────────────

type JobBlockProps = { appt: Appointment; onTap: () => void }

function JobBlock({ appt, onTap }: JobBlockProps) {
  if (!appt.start_time) return null

  const top    = timeToY(appt.start_time)
  const height = Math.max(appt.duration_hours ? appt.duration_hours * HOUR_H : HOUR_H / 2, 28)

  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: appt.id,
    data: { initialTop: top },
  })

  const snapPx  = HOUR_H / 2
  const snapY   = transform ? Math.round(transform.y / snapPx) * snapPx : 0
  const isDone  = appt.status === 'completed' || appt.status === 'payment_received'
  const isPaid  = appt.status === 'payment_received'
  const name    = appt.clients?.first_name ?? '?'

  const bg = isPaid ? 'bg-green-100 border-green-400 text-green-900'
    : isDone ? 'bg-slate-100 border-slate-400 text-slate-500'
    : 'bg-teal-100 border-teal-500 text-teal-900'

  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        top,
        left: 1,
        right: 1,
        height,
        transform: transform ? `translate(${transform.x}px, ${snapY}px)` : undefined,
        zIndex: isDragging ? 30 : 2,
      }}
      className={`rounded border-l-2 px-1 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none
        ${bg} ${isDone ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg opacity-90 ring-1 ring-teal-400' : ''}`}
    >
      <p className="text-[10px] font-semibold leading-tight truncate">{name}</p>
      {height >= 36 && (
        <p className="text-[9px] leading-tight opacity-70">{formatTime(appt.start_time)}</p>
      )}
    </div>
  )
}

// ── droppable day column ──────────────────────────────────────────────────────

function TimeColumn({ date, isToday, children }: { date: string; isToday: boolean; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: date })
  return (
    <div
      ref={setNodeRef}
      className={`relative flex-1 border-r border-slate-100 transition-colors
        ${isToday ? 'bg-teal-50/30' : ''}
        ${isOver ? 'bg-teal-100/50' : ''}`}
      style={{ height: TOTAL_H }}
    >
      {children}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { appointments, loading, error, addAppointment, updateAppointment, updateFutureAppointments, deleteAppointment, deleteFutureAppointments } = useAppointments()
  const { clients } = useClients()
  const { createInvoice } = useInvoices()

  const [view, setView]           = useState<'list' | 'week'>('list')
  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [today, setToday]         = useState(todayStr)
  const [endOfWeek, setEndOfWeek] = useState(getEndOfWeek)
  const [showForm, setShowForm]   = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editingAppt, setEditingAppt]   = useState<Appointment | undefined>()
  const [invoiceAppt, setInvoiceAppt]   = useState<Appointment | undefined>()
  const [pendingReschedule, setPendingReschedule] = useState<{ appt: Appointment; newDate: string; newTime: string } | null>(null)
  const [pendingEdit, setPendingEdit]     = useState<{ appt: Appointment; data: NewAppointment } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null)
  const [currentTimeY, setCurrentTimeY] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Correct SSR UTC offset on client
  useEffect(() => {
    setWeekStart(getWeekStart())
    setToday(todayStr())
    setEndOfWeek(getEndOfWeek())
  }, [])

  // Current time line
  useEffect(() => {
    function update() {
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      const y = (mins - START_H * 60) / 60 * HOUR_H
      setCurrentTimeY(mins >= START_H * 60 && mins <= END_H * 60 ? y : null)
    }
    update()
    const t = setInterval(update, 60_000)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll to current time when entering week view
  useEffect(() => {
    if (view === 'week' && gridRef.current) {
      const target = currentTimeY != null ? Math.max(0, currentTimeY - 80) : 0
      gridRef.current.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [view, weekStart])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 300, tolerance: 8 } }),
  )

  const weekDates = getWeekDates(weekStart)
  const grouped   = groupByDate(appointments)
  const sortedDates = Object.keys(grouped).sort()
  const listDates = sortedDates.filter(d => d >= today && d <= endOfWeek)

  // list-view handlers
  const handleAdd  = async (d: NewAppointment) => { await addAppointment(d) }
  const handleEdit = async (d: NewAppointment) => {
    if (!editingAppt) return
    if (editingAppt.is_recurring) {
      // Defer save — AppointmentForm will call onClose() after onSave() returns,
      // closing the form. The scope modal then shows based on pendingEdit state.
      setPendingEdit({ appt: editingAppt, data: d })
    } else {
      await updateAppointment(editingAppt.id, d)
    }
  }
  const handleDelete = async () => {
    if (!editingAppt) return
    if (editingAppt.is_recurring) {
      setPendingDelete(editingAppt)
      // AppointmentForm calls onClose() after onDelete() returns — form closes, scope modal appears
    } else {
      await deleteAppointment(editingAppt.id)
    }
  }
  const openEdit  = (a: Appointment) => { setEditingAppt(a); setShowForm(true) }
  const closeForm = ()                => { setShowForm(false); setEditingAppt(undefined) }

  const confirmEditSingle = async () => {
    if (!pendingEdit) return
    await updateAppointment(pendingEdit.appt.id, pendingEdit.data)
    setPendingEdit(null)
  }
  const confirmEditAllFuture = async () => {
    if (!pendingEdit) return
    const updates: Partial<NewAppointment> = {
      start_time:      pendingEdit.data.start_time,
      duration_hours:  pendingEdit.data.duration_hours,
      price:           pendingEdit.data.price,
      notes:           pendingEdit.data.notes,
      recurrence_rule: pendingEdit.data.recurrence_rule,
      recurrence_end:  pendingEdit.data.recurrence_end,
    }
    await updateFutureAppointments(pendingEdit.appt.client_id, today, updates)
    setPendingEdit(null)
  }

  const confirmDeleteSingle = async () => {
    if (!pendingDelete) return
    await deleteAppointment(pendingDelete.id)
    setPendingDelete(null)
  }
  const confirmDeleteAllFuture = async () => {
    if (!pendingDelete) return
    await deleteFutureAppointments(pendingDelete.client_id, pendingDelete.scheduled_date)
    setPendingDelete(null)
  }

  const handleToggleStatus = async (id: string, s: 'scheduled' | 'completed' | 'payment_received') => {
    await updateAppointment(id, { status: s })
  }
  const handleCreateInvoice = async (d: NewInvoice) => { await createInvoice(d) }

  // dnd
  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false)
    const { active, over, delta } = event
    if (!over) return
    const appt = appointments.find(a => a.id === active.id)
    if (!appt) return

    const initialTop  = (active.data.current as { initialTop: number }).initialTop
    const newDate     = over.id as string
    const newTime     = yToTime(initialTop + (delta.y ?? 0))
    const sameDate    = appt.scheduled_date === newDate
    const sameTime    = newTime === appt.start_time
    if (sameDate && sameTime) return

    if (appt.is_recurring) {
      setPendingReschedule({ appt, newDate, newTime })
    } else {
      updateAppointment(appt.id, { scheduled_date: newDate, start_time: newTime })
    }
  }

  const confirmMoveSingle = async () => {
    if (!pendingReschedule) return
    await updateAppointment(pendingReschedule.appt.id, {
      scheduled_date: pendingReschedule.newDate,
      start_time: pendingReschedule.newTime,
    })
    setPendingReschedule(null)
  }
  const confirmMoveAllFuture = async () => {
    if (!pendingReschedule) return
    await updateAppointment(pendingReschedule.appt.id, {
      scheduled_date: pendingReschedule.newDate,
      start_time: pendingReschedule.newTime,
    })
    await updateFutureAppointments(pendingReschedule.appt.client_id, today, {
      start_time: pendingReschedule.newTime,
    })
    setPendingReschedule(null)
  }

  // list-view card
  const renderCard = (appt: Appointment) => {
    const client  = appt.clients
    const name    = client ? `${client.first_name} ${client.last_name}` : 'Unknown client'
    const address = client?.address ? `${client.address}${client.city ? ', ' + client.city : ''}` : null
    const isDone  = appt.status === 'completed' || appt.status === 'payment_received'
    const isPaid  = appt.status === 'payment_received'
    return (
      <Card key={appt.id} className={`p-4 ${appt.status !== 'scheduled' ? 'opacity-60' : ''}`} onClick={() => openEdit(appt)}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p className="font-semibold text-slate-900 text-[15px]">{name}</p>
            {appt.is_recurring && <Badge variant="teal"><RefreshCw className="w-2.5 h-2.5 mr-1" />{appt.recurrence_rule}</Badge>}
          </div>
          <p className={`text-lg font-semibold flex-shrink-0 ${appt.price === 0 ? 'text-slate-400' : 'text-amber-600'}`}>{fmtPrice(appt.price)}</p>
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
        {appt.notes      && <p className="text-xs text-slate-400 mt-1.5 truncate">{appt.notes}</p>}
        {client?.notes   && <p className="text-xs text-slate-400 mt-1.5 italic truncate">{client.notes}</p>}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center py-1.5 gap-3">
            <p className="text-sm text-slate-700 flex-1">Job done</p>
            <button type="button" onClick={e => { e.stopPropagation(); handleToggleStatus(appt.id, isDone ? 'scheduled' : 'completed') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isDone ? 'bg-teal-500' : 'bg-slate-300'}`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDone ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center py-1.5 gap-3">
            <p className={`text-sm flex-1 ${isDone ? 'text-slate-700' : 'text-slate-400'}`}>Payment received</p>
            <button type="button" disabled={!isDone} onClick={e => { e.stopPropagation(); handleToggleStatus(appt.id, isPaid ? 'completed' : 'payment_received') }}
              className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isPaid ? 'bg-teal-500' : 'bg-slate-300'} disabled:opacity-40 disabled:cursor-not-allowed`}>
              <span className={`absolute left-0 top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPaid ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {isPaid && (
            <button type="button" onClick={e => { e.stopPropagation(); setInvoiceAppt(appt) }}
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
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
              {(['list', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v === 'list' ? '≡ List' : '📅 Week'}
                </button>
              ))}
            </div>

            {view === 'list' ? (
              listDates.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No jobs this week"
                  description="Nothing scheduled through Sunday. Switch to Week view to see further ahead or book a new job."
                  actionLabel="Book job" onAction={() => setShowForm(true)} />
              ) : (
                <div className="space-y-6">
                  {listDates.map(date => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{formatDate(date)}</p>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">{grouped[date].length} job{grouped[date].length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-3">{grouped[date].map(a => renderCard(a))}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── Week / calendar view ── */
              <DndContext
                sensors={sensors}
                collisionDetection={args => pointerWithin(args).length > 0 ? pointerWithin(args) : rectIntersection(args)}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setIsDragging(false)}
              >
                {/* Week navigation */}
                <div className="flex items-center justify-between mb-3">
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

                {/* Drag week navigation — tap with free finger while holding a card */}
                {isDragging && (
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setWeekStart(shiftWeek(weekStart, -7))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-medium text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev week
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekStart(shiftWeek(weekStart, 7))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-medium text-sm"
                    >
                      Next week
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Scrollable calendar grid */}
                <div ref={gridRef} className="overflow-y-auto rounded-xl border border-slate-100" style={{ maxHeight: '68vh' }}>

                  {/* Sticky day headers */}
                  <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="w-8 flex-shrink-0" />
                    {weekDates.map((date, idx) => {
                      const isToday = date === today
                      const dayNum  = Number(date.split('-')[2])
                      return (
                        <div key={date} className="flex-1 text-center py-2 border-r border-slate-100 last:border-r-0">
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? 'text-teal-500' : 'text-slate-400'}`}>
                            {WEEK_LABELS[idx]}
                          </p>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto mt-0.5 ${isToday ? 'bg-teal-500' : ''}`}>
                            <span className={`text-xs font-bold ${isToday ? 'text-white' : 'text-slate-600'}`}>{dayNum}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Unscheduled jobs row — only shown when at least one day has timeless jobs */}
                  {weekDates.some(date => (grouped[date] ?? []).some(a => !a.start_time)) && (
                    <div className="flex border-b border-slate-100 bg-slate-50/70">
                      <div className="w-8 flex-shrink-0 flex items-start justify-end pt-1.5 pr-1.5">
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider leading-tight text-right">No time</span>
                      </div>
                      {weekDates.map(date => {
                        const timeless = (grouped[date] ?? []).filter(a => !a.start_time)
                        return (
                          <div key={date} className="flex-1 py-1 px-0.5 border-r border-slate-100 last:border-r-0 min-h-[28px]">
                            {timeless.map(appt => {
                              const name  = appt.clients?.first_name ?? '?'
                              const isDone = appt.status === 'completed' || appt.status === 'payment_received'
                              return (
                                <button key={appt.id} onClick={() => openEdit(appt)}
                                  className={`w-full text-left text-[9px] font-semibold px-1 py-0.5 rounded mb-0.5 truncate border
                                    ${isDone ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-teal-50 border-teal-200 text-teal-800'}`}>
                                  {name}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Time grid */}
                  <div className="flex" style={{ height: TOTAL_H }}>

                    {/* Hour labels */}
                    <div className="w-8 flex-shrink-0 relative border-r border-slate-100">
                      {HOURS.slice(1).map(h => (
                        <div key={h}
                          style={{ position: 'absolute', top: (h - START_H) * HOUR_H - 7, right: 4 }}
                          className="text-[9px] text-slate-400 leading-none">
                          {formatHourLabel(h)}
                        </div>
                      ))}
                    </div>

                    {/* Day columns + grid lines */}
                    <div className="flex-1 relative flex">

                      {/* Horizontal hour lines (behind everything) */}
                      {HOURS.map(h => (
                        <div key={h}
                          style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, zIndex: 0 }}
                          className="border-t border-slate-100 pointer-events-none" />
                      ))}
                      {/* Half-hour lines */}
                      {HOURS.slice(0, -1).map(h => (
                        <div key={h}
                          style={{ position: 'absolute', top: (h - START_H) * HOUR_H + HOUR_H / 2, left: 0, right: 0, zIndex: 0 }}
                          className="border-t border-slate-50 pointer-events-none" />
                      ))}

                      {/* Current time line */}
                      {currentTimeY != null && (
                        <div style={{ position: 'absolute', top: currentTimeY, left: 0, right: 0, zIndex: 10 }}
                          className="pointer-events-none flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 -ml-1" />
                          <div className="flex-1 border-t-2 border-red-400" />
                        </div>
                      )}

                      {/* 7 droppable day columns */}
                      {weekDates.map(date => {
                        const dayJobs = (grouped[date] ?? [])
                          .filter(a => a.start_time)
                          .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
                        return (
                          <TimeColumn key={date} date={date} isToday={date === today}>
                            {dayJobs.map(appt => (
                              <JobBlock key={appt.id} appt={appt} onTap={() => openEdit(appt)} />
                            ))}
                          </TimeColumn>
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

      {/* Move scope modal — recurring drag reschedule */}
      {pendingReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl p-5 w-[320px] mx-4 shadow-xl">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Move recurring job</h3>
            <p className="text-sm text-slate-400 mb-4">
              {formatDate(pendingReschedule.newDate)} at {formatTime(pendingReschedule.newTime)}
            </p>
            <div className="space-y-2">
              <button onClick={confirmMoveSingle}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Move just this job</p>
                <p className="text-xs text-slate-400 mt-0.5">Move only this occurrence to the new date and time</p>
              </button>
              <button onClick={confirmMoveAllFuture}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Move all future jobs in this series</p>
                <p className="text-xs text-slate-400 mt-0.5">Move this job and update the time for all upcoming jobs in the series</p>
              </button>
            </div>
            <button onClick={() => setPendingReschedule(null)} className="mt-3 w-full text-sm text-slate-400 py-2 hover:text-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Edit scope modal */}
      {pendingEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl p-5 w-[320px] mx-4 shadow-xl">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Edit recurring job</h3>
            <p className="text-sm text-slate-400 mb-4">Which jobs should be updated?</p>
            <div className="space-y-2">
              <button onClick={confirmEditSingle}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Edit just this job</p>
                <p className="text-xs text-slate-400 mt-0.5">Save changes to this one occurrence only</p>
              </button>
              <button onClick={confirmEditAllFuture}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Edit all future jobs in this series</p>
                <p className="text-xs text-slate-400 mt-0.5">Update time, price, and notes for this and all upcoming jobs</p>
              </button>
            </div>
            <button onClick={() => setPendingEdit(null)} className="mt-3 w-full text-sm text-slate-400 py-2 hover:text-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Delete scope modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl p-5 w-[320px] mx-4 shadow-xl">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">Delete recurring job</h3>
            <p className="text-sm text-slate-400 mb-4">Which jobs should be deleted?</p>
            <div className="space-y-2">
              <button onClick={confirmDeleteSingle}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Delete just this job</p>
                <p className="text-xs text-slate-400 mt-0.5">Remove this one occurrence only</p>
              </button>
              <button onClick={confirmDeleteAllFuture}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors">
                <p className="text-sm font-semibold text-slate-900">Delete all future jobs in this series</p>
                <p className="text-xs text-slate-400 mt-0.5">Remove this and all upcoming jobs in the series</p>
              </button>
            </div>
            <button onClick={() => setPendingDelete(null)} className="mt-3 w-full text-sm text-slate-400 py-2 hover:text-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

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
