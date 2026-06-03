'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useMileage, calcDeduction, tripDeduction, CRA_RATE_TIER1, CRA_KM_THRESHOLD } from '@/lib/hooks/useMileage'
import { usePlan } from '@/lib/hooks/usePlan'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { Car, Plus, Trash2, Pencil, MapPin, X } from 'lucide-react'
import type { MileageLog, NewMileageLog } from '@/lib/types'

function formatDate(ds: string) {
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function groupByMonth(logs: MileageLog[]) {
  return logs.reduce((g, l) => {
    const key = l.trip_date.slice(0, 7)
    if (!g[key]) g[key] = []
    g[key].push(l)
    return g
  }, {} as Record<string, MileageLog[]>)
}

function formatMonth(m: string) {
  return new Date(m + '-01T12:00:00').toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

// ── Trip form (bottom sheet) ──────────────────────────────────────────────────

function TripForm({ log, onSave, onClose, onDelete }: {
  log?: MileageLog
  onSave: (data: NewMileageLog) => Promise<void>
  onClose: () => void
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<NewMileageLog>(log ? {
    trip_date:      log.trip_date,
    start_location: log.start_location ?? '',
    end_location:   log.end_location ?? '',
    km:             log.km,
    notes:          log.notes ?? '',
  } : {
    trip_date:      new Date().toISOString().split('T')[0],
    start_location: '',
    end_location:   '',
    km:             0,
    notes:          '',
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const set = <K extends keyof NewMileageLog>(k: K, v: NewMileageLog[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.trip_date) { setError('Date is required.'); return }
    if (!form.km || form.km <= 0) { setError('Enter km driven (must be > 0).'); return }
    setSaving(true); setError(null)
    try {
      await onSave({
        ...form,
        start_location: form.start_location || null,
        end_location:   form.end_location   || null,
        notes:          form.notes          || null,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this trip?')) return
    setDeleting(true)
    try { await onDelete(); onClose() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Could not delete.') }
    finally { setDeleting(false) }
  }

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-t-2xl">
          <h2 className="text-[15px] font-semibold text-slate-900">{log ? 'Edit trip' : 'Log a trip'}</h2>
          <div className="flex items-center gap-2">
            {log && onDelete && (
              <button onClick={handleDelete} disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.trip_date}
                onChange={e => set('trip_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">KM driven <span className="text-red-400">*</span></label>
              <input type="number" min="0.1" step="0.1" value={form.km || ''}
                onChange={e => set('km', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 12.5" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Start location <span className="text-slate-300">(optional)</span></label>
            <input type="text" value={form.start_location ?? ''}
              onChange={e => set('start_location', e.target.value)}
              placeholder="e.g. Home, 123 Main St" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">End location <span className="text-slate-300">(optional)</span></label>
            <input type="text" value={form.end_location ?? ''}
              onChange={e => set('end_location', e.target.value)}
              placeholder="e.g. Client's house, 456 Oak Ave" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes <span className="text-slate-300">(optional)</span></label>
            <input type="text" value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Supply run, client visit" className={inputCls} />
          </div>

          {form.km > 0 && (
            <div className="bg-teal-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-teal-600">Est. deduction @ ${CRA_RATE_TIER1}/km</p>
              <p className="text-sm font-semibold text-teal-700">
                ${(form.km * CRA_RATE_TIER1).toFixed(2)}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>
              {log ? 'Save changes' : 'Log trip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MileagePage() {
  const { isPro } = usePlan()
  const { logs, loading, error, addLog, updateLog, deleteLog } = useMileage()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<MileageLog | undefined>()

  if (!isPro) {
    return (
      <AppShell>
        <TopHeader title="Mileage" />
        <PageContainer>
          <UpgradePrompt
            feature="Mileage tracker"
            description="Track business km for CRA deductions. Every km logged saves you money at tax time."
          />
        </PageContainer>
      </AppShell>
    )
  }

  const totalKm     = logs.reduce((s, l) => s + l.km, 0)
  const deduction   = calcDeduction(logs)
  const remaining   = Math.max(0, CRA_KM_THRESHOLD - totalKm)

  // Build per-trip deductions using running annual total
  const sortedAsc   = [...logs].sort((a, b) => a.trip_date.localeCompare(b.trip_date))
  let runningKm     = 0
  const tripDedMap  = new Map<string, number>()
  for (const l of sortedAsc) {
    tripDedMap.set(l.id, tripDeduction(l.km, runningKm))
    runningKm += l.km
  }

  const grouped   = groupByMonth(logs)
  const months    = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const openEdit = (l: MileageLog) => { setEditing(l); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(undefined) }

  return (
    <AppShell>
      <TopHeader
        title="Mileage"
        subtitle={`${totalKm.toFixed(1)} km logged`}
        action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" />Log trip</Button>}
      />

      <PageContainer>
        {loading ? <PageSkeleton /> : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : (
          <>
            {/* Year-to-date summary */}
            {logs.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Total km</p>
                  <p className="text-2xl font-semibold text-teal-700 dark:text-teal-400">{totalKm.toFixed(1)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    {remaining > 0
                      ? `${remaining.toFixed(0)} km until tier 2 rate`
                      : `${(totalKm - CRA_KM_THRESHOLD).toFixed(0)} km at tier 2 ($0.66/km)`}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Est. deduction</p>
                  <p className="text-2xl font-semibold text-amber-600">${deduction.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">CRA rate · this year</p>
                </div>
              </div>
            )}

            {/* CRA rate info */}
            {logs.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 mb-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-600 dark:text-slate-300">CRA 2025 rate:</span> $0.72/km for first {CRA_KM_THRESHOLD.toLocaleString()} km · $0.66/km after.
                Keep a logbook with date, destination, and business purpose for each trip.
              </div>
            )}

            {/* Trip list */}
            {logs.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No trips logged yet"
                description="Track your business driving to claim the CRA mileage deduction at tax time."
                actionLabel="Log your first trip"
                onAction={() => setShowForm(true)}
              />
            ) : (
              <div className="space-y-6">
                {months.map(month => {
                  const monthLogs = grouped[month]
                  const monthKm  = monthLogs.reduce((s, l) => s + l.km, 0)
                  return (
                    <div key={month}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{formatMonth(month)}</p>
                        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                        <span className="text-xs text-slate-400 dark:text-slate-500">{monthKm.toFixed(1)} km</span>
                      </div>
                      <div className="space-y-2">
                        {monthLogs.map(l => (
                          <Card key={l.id} className="p-4" onClick={() => openEdit(l)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(l.trip_date)}</p>
                                </div>
                                {(l.start_location || l.end_location) ? (
                                  <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-200">
                                    <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={1.8} />
                                    <span className="truncate">
                                      {l.start_location && l.end_location
                                        ? `${l.start_location} → ${l.end_location}`
                                        : l.start_location || l.end_location}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">No locations</p>
                                )}
                                {l.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{l.notes}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{l.km.toFixed(1)} km</p>
                                <p className="text-xs text-amber-600 font-medium">${(tripDedMap.get(l.id) ?? 0).toFixed(2)}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </PageContainer>

      {showForm && (
        <TripForm
          log={editing}
          onSave={editing
            ? (d) => updateLog(editing.id, d)
            : (d) => addLog(d)
          }
          onClose={closeForm}
          onDelete={editing ? () => deleteLog(editing.id) : undefined}
        />
      )}
    </AppShell>
  )
}
