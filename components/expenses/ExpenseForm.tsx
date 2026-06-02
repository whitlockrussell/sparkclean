'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Camera, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Expense, NewExpense } from '@/lib/types'

interface ExpenseFormProps {
  expense?: Expense
  onSave: (data: NewExpense) => Promise<void>
  onClose: () => void
}

const categories = [
  { value: 'supplies',  label: '🧹 Supplies' },
  { value: 'gas',       label: '⛽ Gas' },
  { value: 'equipment', label: '🔧 Equipment' },
  { value: 'insurance', label: '🛡️ Insurance' },
  { value: 'phone',     label: '📱 Phone' },
  { value: 'other',     label: '📦 Other' },
]

const empty: NewExpense = {
  description: '',
  amount: 0,
  hst_paid: 0,
  category: 'supplies',
  receipt_url: null,
  expense_date: new Date().toISOString().split('T')[0],
}

// Resize image to max 1000px wide and compress to JPEG quality 0.7
// This keeps file size under ~200KB which is well within Anthropic's limits
function resizeImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const MAX = 1000
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      resolve({
        base64: dataUrl.split(',')[1],
        mediaType: 'image/jpeg',
      })
    }
    img.src = url
  })
}

export function ExpenseForm({ expense, onSave, onClose }: ExpenseFormProps) {
  const [form, setForm] = useState<NewExpense>(
    expense ? {
      description: expense.description,
      amount: expense.amount,
      hst_paid: expense.hst_paid,
      category: expense.category,
      receipt_url: expense.receipt_url,
      expense_date: expense.expense_date,
    } : empty
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [scanningReceipt, setScanningReceipt] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(expense?.receipt_url ?? null)
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null)
  const [receiptMediaType, setReceiptMediaType] = useState<string>('image/jpeg')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const set = <K extends keyof NewExpense>(field: K, value: NewExpense[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingReceipt(true)
    setError(null)

    try {
      // Resize for preview and AI scanning
      const { base64, mediaType } = await resizeImage(file)
      setReceiptPreview(`data:${mediaType};base64,${base64}`)
      setReceiptBase64(base64)
      setReceiptMediaType(mediaType)

      // Upload original to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/receipts/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(path)

      set('receipt_url', publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const scanReceiptWithAI = async () => {
    if (!receiptBase64) {
      setError('Upload a receipt photo first, then tap Auto-fill.')
      return
    }
    setScanningReceipt(true)
    setError(null)
    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: receiptBase64,
          mediaType: receiptMediaType,
        }),
      })

      const parsed = await response.json()

      if (!response.ok) {
        throw new Error(parsed.error ?? 'Scan failed')
      }

      if (parsed.description) set('description', parsed.description)
      if (parsed.amount) set('amount', parsed.amount)
      if (parsed.hst_paid !== undefined) set('hst_paid', parsed.hst_paid)
      if (parsed.expense_date) set('expense_date', parsed.expense_date)
      if (parsed.category) set('category', parsed.category as NewExpense['category'])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not read receipt. Please fill in manually.')
    } finally {
      setScanningReceipt(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Please enter a description.'); return }
    if (!form.amount || form.amount <= 0) { setError('Amount must be greater than $0.'); return }

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

  const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl lg:rounded-t-2xl">
          <h2 className="text-[15px] font-semibold text-slate-900">
            {expense ? 'Edit expense' : 'Log expense'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Receipt upload */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Receipt photo</label>
            {receiptPreview ? (
              <div className="space-y-2">
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    className="w-full h-40 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => { setReceiptPreview(null); setReceiptBase64(null); set('receipt_url', null) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={scanReceiptWithAI}
                  disabled={scanningReceipt || uploadingReceipt}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
                >
                  {scanningReceipt ? (
                    <>
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      Reading receipt with AI…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Auto-fill from receipt
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingReceipt}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-teal-300 hover:text-teal-500 transition-colors"
              >
                {uploadingReceipt ? (
                  <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6" strokeWidth={1.5} />
                    <span className="text-sm font-medium">Take photo or upload receipt</span>
                    <span className="text-xs">AI will auto-fill the details · CRA accepts digital copies</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptUpload}
              className="hidden"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => set('category', cat.value as NewExpense['category'])}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                    form.category === cat.value
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Cleaning supplies from Costco"
              className={inputClass}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={e => set('expense_date', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Amount + HST */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Total amount ($) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ''}
                onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                placeholder="68.50"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">HST paid ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.hst_paid || ''}
                onChange={e => set('hst_paid', parseFloat(e.target.value) || 0)}
                placeholder="8.91"
                className={inputClass}
              />
              <p className="text-[11px] text-slate-400 mt-1">Input tax credit</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>
              {expense ? 'Save changes' : 'Log expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}