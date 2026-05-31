'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Trash2 } from 'lucide-react'
import type { Appointment, NewAppointment, Client } from '@/lib/types'

interface AppointmentFormProps {
  clients: Client[]
  appointment?: Appointment
  defaultClientId?: string
  onSave: (data: NewAppointment) => Promise<void>
  onClose: () => void
  onDelete?: () => Promise<void>
}

const empty = (clientId = ''): NewAppointment => ({
  client_id: clientId,
  scheduled_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  duration_hours: 2,
  price: 0,
  status: 'scheduled',
  is_recurring: false,
  recurrence_rule: null,
  recurrence_end: null,
  notes: '',
})

export function AppointmentForm({
  clients,
  appointment,
  defaultClientId,
  onSave,
  onClose,
  onDelete,
}: AppointmentFormProps) {
  const [form, setForm] = useState<NewAppointment>(
    appointment
      ? {
          client_id: appointment.client_id,
          scheduled_date: appointment.scheduled_date,
          start_time: appointment.start_time ?? '09:00',
          duration_hours: appointment.duration_hours ?? 2,
          price: appointment.price,
          status: appointment.status,
          is_recurring: appointment.is_recurring ?? false,
          recurrence_rule: appointment.recurrence_rule ?? null,
          recurrence_end: appointment.recurrence_end ?? null,
          notes: appointment.notes ?? '',
        }
      : empty(defaultClientId)
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof NewAppointment>(field: K, value: NewAppointment[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) { setError('Please select a client.'); return }
    if (!form.scheduled_date) { setError('Please choose a date.'); return }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...form,
        recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
        recurrence_end: form.is_recurring ? form.recurrence_end : null,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    // Recurring jobs skip the browser confirm — parent shows a proper scope modal instead
    if (!appointment?.is_recurring) {
      if (!confirm('Delete this job? This cannot be undone.')) return
    }
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete job.')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-t-2xl">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {appointment ? 'Edit job' : 'Book a job'}
          </h2>
          <div className="flex items-center gap-2">
            {appointment && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                aria-label="Delete job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Client <span className="text-red-400">*</span>
            </label>
            {clients.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                Add a client first before booking a job.
              </p>
            ) : (
              <select
                value={form.client_id}
                onChange={e => set('client_id', e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => set('scheduled_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start time</label>
              <input
                type="time"
                value={form.start_time ?? '09:00'}
                onChange={e => set('start_time', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Duration + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration (hours)</label>
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={form.duration_hours ?? 2}
                onChange={e => set('duration_hours', parseFloat(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Price ($)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={form.price || ''}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
                placeholder="TBD"
                className={inputClass}
              />
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Recurring job</p>
                <p className="text-xs text-slate-400">Repeats automatically</p>
              </div>
              <label className="relative inline-block w-11 h-6 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!form.is_recurring}
                  onChange={() => {
                    const next = !form.is_recurring
                    setForm(prev => ({ ...prev, is_recurring: next, recurrence_rule: next && !prev.recurrence_rule ? 'weekly' : prev.recurrence_rule }))
                  }}
                />
                <span className="absolute inset-0 rounded-full bg-slate-300 transition-all duration-200 peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow-sm after:transition-all after:duration-200 peer-checked:after:left-[22px]" />
              </label>
            </div>

            {form.is_recurring && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Repeats</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['weekly', 'biweekly', 'monthly'] as const).map(rule => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => set('recurrence_rule', rule)}
                        className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                          form.recurrence_rule === rule
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {rule.charAt(0).toUpperCase() + rule.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">End date (optional)</label>
                  <input
                    type="date"
                    value={form.recurrence_end ?? ''}
                    onChange={e => set('recurrence_end', e.target.value || null)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Deep clean, bring extra supplies, key under mat…"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>
              {appointment ? 'Save changes' : 'Book job'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}