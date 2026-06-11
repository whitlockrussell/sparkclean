'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Client } from '@/lib/types'
import type { NewInvoice } from '@/lib/hooks/useInvoices'
import { useBusiness } from '@/lib/hooks/useBusiness'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface InvoiceFormProps {
  clients: Client[]
  onSave: (data: NewInvoice) => Promise<void>
  onClose: () => void
  initialClientId?: string
  initialAppointmentId?: string
  initialItems?: LineItem[]
}

export function InvoiceForm({ clients, onSave, onClose, initialClientId, initialAppointmentId, initialItems }: InvoiceFormProps) {
  const { business } = useBusiness()
  const [clientId, setClientId] = useState(initialClientId ?? '')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'e_transfer' | 'cheque' | ''>('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>(
    initialItems ?? [{ description: 'Standard home cleaning', quantity: 1, unit_price: 0 }]
  )
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [taxRate, setTaxRate] = useState(13)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (business) {
      setTaxEnabled(business.tax_default_on ?? true)
      setTaxRate(business.tax_rate ?? 13)
    }
  }, [business])

  const taxLabel      = business?.tax_label ?? 'Tax'
  const taxConfigured = (business?.tax_rate ?? 0) > 0

  const addItem = () =>
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i))

  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmt = taxConfigured && taxEnabled ? subtotal * (taxRate / 100) : 0
  const total = subtotal + taxAmt

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    if (items.some(i => !i.description.trim())) { setError('All line items need a description.'); return }
    if (subtotal <= 0) { setError('Invoice total must be greater than $0.'); return }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        client_id: clientId,
        appointment_id: initialAppointmentId ?? null,
        due_date: dueDate,
        notes,
        items,
        tax_rate: taxRate,
        tax_enabled: taxEnabled,
        payment_method: paymentMethod || null,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-t-2xl">
          <h2 className="text-[15px] font-semibold text-slate-900">New invoice</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Client <span className="text-red-400">*</span>
            </label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
              <option value="">Select a client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Due date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Payment method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)} className={inputClass}>
              <option value="">Not specified</option>
              <option value="cash">Cash</option>
              <option value="e_transfer">E-transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500">Line items</label>
              <button type="button" onClick={addItem} className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:text-teal-700">
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      placeholder="Description e.g. Standard home cleaning"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400 transition-colors mt-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                      <input
                        type="number" min="0.5" step="0.5"
                        value={item.quantity || ''}
                        onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                        placeholder="1"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Unit price ($)</label>
                      <input
                        type="number" min="0" step="5"
                        value={item.unit_price || ''}
                        onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="150"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    Line total: <span className="font-medium text-slate-700">${(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {taxConfigured && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setTaxEnabled(v => !v)}
                    aria-label="Toggle tax"
                    className={`relative w-9 h-5 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
                      taxEnabled ? 'bg-teal-500' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                      taxEnabled ? 'left-[18px]' : 'left-[2px]'
                    }`} />
                  </button>
                  <span className="text-sm text-slate-600">{taxLabel}</span>
                  {taxEnabled && (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-12 border border-slate-200 rounded-lg px-1.5 py-1 text-xs text-center text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-slate-600 flex-shrink-0">
                  {taxEnabled ? `$${taxAmt.toFixed(2)}` : '—'}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[15px] font-semibold text-slate-900 border-t border-slate-200 pt-2 mt-2">
              <span>Total</span>
              <span className="text-amber-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes (shown on invoice)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Thank you for your business!"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>Create invoice</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
