'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client, Invoice } from '@/lib/types'

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
}

interface EditInvoiceFormProps {
  invoice: Invoice
  clients: Client[]
  onSave: () => void
  onClose: () => void
  onDelete?: () => Promise<void>
}

const HST_RATE = 0.13

export function EditInvoiceForm({ invoice, clients, onSave, onClose, onDelete }: EditInvoiceFormProps) {
  const [clientId, setClientId] = useState(invoice.client_id)
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '')
  const [notes, setNotes] = useState(invoice.notes ?? '')
  const [items, setItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('sort_order')
      setItems(data?.map(i => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })) ?? [])
      setLoading(false)
    }
    load()
  }, [invoice.id])

  const addItem = () =>
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i))

  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const hst = subtotal * HST_RATE
  const total = subtotal + hst

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    if (items.some(i => !i.description.trim())) { setError('All items need a description.'); return }
    if (subtotal <= 0) { setError('Total must be greater than $0.'); return }

    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: invError } = await supabase
        .from('invoices')
        .update({
          client_id: clientId,
          due_date: dueDate || null,
          notes: notes || null,
          subtotal: Math.round(subtotal * 100) / 100,
          hst_amount: Math.round(hst * 100) / 100,
          total: Math.round(total * 100) / 100,
        })
        .eq('id', invoice.id)

      if (invError) throw new Error(invError.message)

      await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items.map((item, i) => ({
          invoice_id: invoice.id,
          user_id: user.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Math.round(item.quantity * item.unit_price * 100) / 100,
          sort_order: i,
        })))

      if (itemsError) throw new Error(itemsError.message)

      onSave()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete invoice.')
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-t-2xl">
          <h2 className="text-[15px] font-semibold text-slate-900">Edit {invoice.invoice_number}</h2>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                aria-label="Delete invoice"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
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
                        placeholder="Description"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
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
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Unit price ($)</label>
                        <input
                          type="number" min="0" step="5"
                          value={item.unit_price || ''}
                          onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="150"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
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
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>HST (13%)</span><span>${hst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[15px] font-semibold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total</span><span className="text-amber-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Thank you for your business!" rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1 pb-2">
              <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="lg" className="flex-1" loading={saving}>Save changes</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}