'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Client, NewClient } from '@/lib/types'
import { X, Trash2 } from 'lucide-react'

interface ClientFormProps {
  client?: Client
  onSave: (data: NewClient) => Promise<void>
  onClose: () => void
  onDelete?: () => Promise<void>
}

const emptyForm: NewClient = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: 'ON',
  postal_code: '',
  notes: '',
  active: true,
}

const provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

export function ClientForm({ client, onSave, onClose, onDelete }: ClientFormProps) {
  const [form, setForm] = useState<NewClient>(
    client
      ? {
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email ?? '',
          phone: client.phone ?? '',
          address: client.address ?? '',
          city: client.city ?? '',
          province: client.province,
          postal_code: client.postal_code ?? '',
          notes: client.notes ?? '',
          active: client.active,
        }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof NewClient, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) {
      setError('First name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this client? This cannot be undone.')) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete client.')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent'

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
            {client ? 'Edit client' : 'Add client'}
          </h2>
          <div className="flex items-center gap-2">
            {client && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                aria-label="Delete client"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                First name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Maria"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Last name
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Rodriguez"
                className={inputClass}
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="613-555-0100"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
              placeholder="client@email.com"
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Street address</label>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={e => set('address', e.target.value)}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
              <input
                type="text"
                value={form.city ?? ''}
                onChange={e => set('city', e.target.value)}
                placeholder="Ottawa"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Province</label>
              <select
                value={form.province}
                onChange={e => set('province', e.target.value)}
                className={inputClass}
              >
                {provinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Postal code</label>
            <input
              type="text"
              value={form.postal_code ?? ''}
              onChange={e => set('postal_code', e.target.value.toUpperCase())}
              placeholder="K1N 5X5"
              maxLength={7}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Has a dog. Prefers unscented products. Key under mat."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              loading={saving}
            >
              {client ? 'Save changes' : 'Add client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}