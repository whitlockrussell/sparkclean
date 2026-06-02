'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Minus, Plus, Calculator } from 'lucide-react'
import type { Client } from '@/lib/types'
import type { NewEstimate } from '@/lib/hooks/useEstimates'

const BASE_HOURS: Record<string, number> = {
  small: 2, medium: 3, large: 4, xl: 5,
}
const CLEAN_MULTIPLIER: Record<string, number> = {
  regular: 1, deep: 1.75, move_in: 2, move_out: 2, post_construction: 2.5,
}
const FREQ_DISCOUNT: Record<string, number> = {
  one_time: 0, weekly: 0.1, biweekly: 0.05, monthly: 0,
}
const EXTRA_HOURS: Record<string, number> = {
  fridge: 0.5, oven: 0.5, cabinets: 0.5,
  windows: 1, laundry: 0.5, wall_washing: 0.5, garage: 0.5,
}
const HST_RATE = 0.13

function calcHours(
  size: string, bedrooms: number, bathrooms: number,
  cleanType: string, frequency: string, extras: string[]
) {
  const base = BASE_HOURS[size] ?? 3
  const brExtra = Math.max(0, bedrooms - 2) * 0.25
  const baExtra = Math.max(0, bathrooms - 1) * 0.5
  const multiplier = CLEAN_MULTIPLIER[cleanType] ?? 1
  const discount = FREQ_DISCOUNT[frequency] ?? 0
  const cleanHours = (base + brExtra + baExtra) * multiplier * (1 - discount)
  const extrasHrs = extras.reduce((s, e) => s + (EXTRA_HOURS[e] ?? 0.5), 0)
  return Math.round((cleanHours + extrasHrs) * 100) / 100
}

function roundToFive(n: number) {
  return Math.round(n / 5) * 5
}

interface EstimateFormProps {
  clients: Client[]
  initialHourlyRate?: number
  onSave: (data: NewEstimate) => Promise<void>
  onClose: () => void
}

function ButtonGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            value === opt.value
              ? 'bg-teal-500 text-white border-teal-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({ value, min, max, onChange }: {
  value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="flex-1 text-center text-sm font-semibold text-slate-900 dark:text-white">
        {value === max ? `${max}+` : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}

export function EstimateForm({ clients, initialHourlyRate = 45, onSave, onClose }: EstimateFormProps) {
  const [clientId, setClientId] = useState('')
  const [propertyType, setPropertyType] = useState('house')
  const [size, setSize] = useState('medium')
  const [bedrooms, setBedrooms] = useState(2)
  const [bathrooms, setBathrooms] = useState(1)
  const [cleanType, setCleanType] = useState('regular')
  const [frequency, setFrequency] = useState('one_time')
  const [extras, setExtras] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [hourlyRate, setHourlyRate] = useState(initialHourlyRate)
  const [overridePrice, setOverridePrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimatedHours = useMemo(
    () => calcHours(size, bedrooms, bathrooms, cleanType, frequency, extras),
    [size, bedrooms, bathrooms, cleanType, frequency, extras]
  )

  const basePrice = useMemo(
    () => roundToFive(estimatedHours * hourlyRate),
    [estimatedHours, hourlyRate]
  )

  const subtotal = overridePrice !== '' ? (parseFloat(overridePrice) || 0) : basePrice
  const hst = Math.round(subtotal * HST_RATE * 100) / 100
  const total = Math.round((subtotal + hst) * 100) / 100

  const toggleExtra = (key: string) =>
    setExtras(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { setError('Please select a client.'); return }
    if (subtotal <= 0) { setError('Price must be greater than $0.'); return }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        client_id: clientId,
        property_type: propertyType,
        size,
        bedrooms,
        bathrooms,
        clean_type: cleanType,
        frequency,
        extras,
        notes: notes || null,
        hourly_rate: hourlyRate,
        estimated_hours: estimatedHours,
        subtotal,
        hst_amount: hst,
        total,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl lg:rounded-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New estimate</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Client <span className="text-red-400">*</span>
            </label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
              <option value="">Select a client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          {/* Property type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Property type</label>
            <ButtonGroup
              value={propertyType}
              onChange={setPropertyType}
              options={[
                { value: 'house', label: 'House' },
                { value: 'condo', label: 'Condo' },
                { value: 'apartment', label: 'Apartment' },
                { value: 'commercial', label: 'Commercial' },
              ]}
            />
          </div>

          {/* Size */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Size</label>
            <ButtonGroup
              value={size}
              onChange={setSize}
              options={[
                { value: 'small', label: 'Small (<1000 sqft)' },
                { value: 'medium', label: 'Med (1–2K sqft)' },
                { value: 'large', label: 'Large (2–3K sqft)' },
                { value: 'xl', label: 'XL (3000+ sqft)' },
              ]}
            />
          </div>

          {/* Rooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bedrooms</label>
              <Stepper value={bedrooms} min={1} max={6} onChange={setBedrooms} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bathrooms</label>
              <Stepper value={bathrooms} min={1} max={5} onChange={setBathrooms} />
            </div>
          </div>

          {/* Clean type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Type of clean</label>
            <ButtonGroup
              value={cleanType}
              onChange={setCleanType}
              options={[
                { value: 'regular', label: 'Regular' },
                { value: 'deep', label: 'Deep Clean' },
                { value: 'move_in', label: 'Move In' },
                { value: 'move_out', label: 'Move Out' },
                { value: 'post_construction', label: 'Post Construction' },
              ]}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Frequency</label>
            <ButtonGroup
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: 'one_time', label: 'One-time' },
                { value: 'weekly', label: 'Weekly −10%' },
                { value: 'biweekly', label: 'Biweekly −5%' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>

          {/* Extras */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Extras (each +0.5 hr)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'fridge', label: 'Inside fridge' },
                { key: 'oven', label: 'Inside oven' },
                { key: 'cabinets', label: 'Inside cabinets' },
                { key: 'windows', label: 'Windows (+1 hr)' },
                { key: 'laundry', label: 'Laundry' },
                { key: 'wall_washing', label: 'Wall washing' },
                { key: 'garage', label: 'Garage' },
              ].map(extra => {
                const active = extras.includes(extra.key)
                return (
                  <button
                    key={extra.key}
                    type="button"
                    onClick={() => toggleExtra(extra.key)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border text-left transition-all ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {active ? '✓ ' : ''}{extra.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Your hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="5"
                value={hourlyRate}
                onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-12 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hr</span>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Price calculator</span>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Estimated time</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{estimatedHours} hrs</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Auto price ({estimatedHours} hrs × ${hourlyRate}/hr)</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">${basePrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Adjust price (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  placeholder={basePrice.toString()}
                  value={overridePrice}
                  onChange={e => setOverridePrice(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg pl-7 py-2 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {overridePrice === '' && (
                <p className="text-[11px] text-slate-400 mt-1">Blank = use auto price (${basePrice})</p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>HST (13%)</span>
                <span>${hst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[15px] font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Total</span>
                <span className="text-amber-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Special instructions or details for the client…"
              rows={2}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none placeholder:text-slate-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1 pb-2">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="lg" className="flex-1" loading={saving}>Create estimate</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
