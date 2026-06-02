'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Printer } from 'lucide-react'

type EstimateData = {
  id: string
  estimate_number: string
  status: string
  issue_date: string
  valid_until: string
  property_type: string
  size: string
  bedrooms: number
  bathrooms: number
  clean_type: string
  frequency: string
  extras: string[]
  notes: string | null
  hourly_rate: number
  estimated_hours: number
  subtotal: number
  hst_amount: number
  total: number
  clients: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    province: string
    postal_code: string | null
  } | null
}

type BusinessData = {
  business_name: string
  hst_number: string | null
  address: string | null
  city: string | null
  province: string
  postal_code: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}

const PROPERTY_LABELS: Record<string, string> = {
  house: 'House', condo: 'Condo', apartment: 'Apartment', commercial: 'Commercial',
}
const SIZE_LABELS: Record<string, string> = {
  small: 'Small (under 1,000 sqft)',
  medium: 'Medium (1,000–2,000 sqft)',
  large: 'Large (2,000–3,000 sqft)',
  xl: 'Extra Large (3,000+ sqft)',
}
const CLEAN_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Cleaning',
  move_in: 'Move-In Cleaning',
  move_out: 'Move-Out Cleaning',
  post_construction: 'Post-Construction Cleaning',
}
const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-time',
  weekly: 'Weekly (10% recurring discount)',
  biweekly: 'Biweekly (5% recurring discount)',
  monthly: 'Monthly',
}
const EXTRA_LABELS: Record<string, string> = {
  fridge: 'Inside fridge', oven: 'Inside oven', cabinets: 'Inside cabinets',
  windows: 'Windows', laundry: 'Laundry', wall_washing: 'Wall washing', garage: 'Garage',
}

function fmt(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function EstimatePDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [estRes, busRes] = await Promise.all([
        supabase
          .from('estimates')
          .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
          .eq('id', id)
          .single(),
        supabase.from('businesses').select('*').single(),
      ])

      if (estRes.data) setEstimate(estRes.data)
      if (busRes.data) setBusiness(busRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Loading estimate…</p>
    </div>
  )

  if (!estimate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Estimate not found.</p>
    </div>
  )

  const client = estimate.clients
  const isAccepted = estimate.status === 'accepted'

  const cleanLabel = CLEAN_TYPE_LABELS[estimate.clean_type] ?? estimate.clean_type
  const propLabel = PROPERTY_LABELS[estimate.property_type] ?? estimate.property_type
  const sizeLabel = SIZE_LABELS[estimate.size] ?? estimate.size
  const freqLabel = FREQUENCY_LABELS[estimate.frequency] ?? estimate.frequency

  return (
    <>
      {/* Toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <p className="text-sm font-medium text-slate-700">{estimate.estimate_number}</p>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm text-white bg-teal-500 rounded-lg px-3 py-1.5 hover:bg-teal-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Save as PDF
          </button>
        </div>
      </div>

      {/* Estimate */}
      <div className="min-h-screen bg-slate-100 print:bg-white pt-16 print:pt-0 pb-16 print:pb-0">
        <div className="max-w-2xl mx-auto bg-white print:max-w-none shadow-sm print:shadow-none p-10 print:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              {business?.logo_url && (
                <img
                  src={business.logo_url}
                  alt="Business logo"
                  className="h-14 w-auto object-contain mb-3"
                />
              )}
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">
                {business?.business_name ?? 'My Business'}
              </h1>
              {business?.address && <p className="text-sm text-slate-500">{business.address}</p>}
              {business?.city && (
                <p className="text-sm text-slate-500">
                  {business.city}, {business.province} {business.postal_code}
                </p>
              )}
              {business?.phone && <p className="text-sm text-slate-500">{business.phone}</p>}
              {business?.email && <p className="text-sm text-slate-500">{business.email}</p>}
              {business?.hst_number && (
                <p className="text-sm text-slate-500 mt-1">HST# {business.hst_number}</p>
              )}
            </div>

            <div className="text-right">
              <div className="inline-block mb-3">
                {isAccepted ? (
                  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">ACCEPTED</span>
                ) : estimate.status === 'declined' ? (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">DECLINED</span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">ESTIMATE</span>
                )}
              </div>
              <p className="text-2xl font-semibold text-slate-900">{estimate.estimate_number}</p>
              <p className="text-sm text-slate-500 mt-1">Issued {fmt(estimate.issue_date)}</p>
              <p className="text-sm text-slate-500">Valid until {fmt(estimate.valid_until)}</p>
            </div>
          </div>

          {/* Estimate for */}
          {client && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estimate for</p>
              <p className="text-sm font-semibold text-slate-900">{client.first_name} {client.last_name}</p>
              {client.address && <p className="text-sm text-slate-500">{client.address}</p>}
              {client.city && (
                <p className="text-sm text-slate-500">{client.city}, {client.province} {client.postal_code}</p>
              )}
              {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
              {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
            </div>
          )}

          {/* Service details */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Services included</p>

            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3">
                    <p className="text-slate-700 font-medium">{cleanLabel}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {propLabel} · {sizeLabel} · {estimate.bedrooms} bedroom{estimate.bedrooms !== 1 ? 's' : ''} / {estimate.bathrooms} bathroom{estimate.bathrooms !== 1 ? 's' : ''}
                    </p>
                    <p className="text-slate-400 text-xs">{freqLabel}</p>
                  </td>
                  <td className="py-3 text-right text-slate-700 font-medium align-top">
                    ${estimate.subtotal.toFixed(2)}
                  </td>
                </tr>

                {estimate.extras.length > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="text-slate-700 font-medium">Additional services</p>
                      <ul className="mt-1 space-y-0.5">
                        {estimate.extras.map(ex => (
                          <li key={ex} className="text-slate-400 text-xs">
                            · {EXTRA_LABELS[ex] ?? ex}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 text-right text-slate-500 text-sm align-top">Included</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>${estimate.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>HST (13%)</span><span>${estimate.hst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900 border-t border-slate-200 pt-2">
                <span>Estimate total</span><span>${estimate.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="border-t border-slate-100 pt-6 mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-slate-500 leading-relaxed">{estimate.notes}</p>
            </div>
          )}

          {/* Accept section */}
          {!isAccepted && (
            <div className="border-t-2 border-slate-200 pt-8 mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Accept this estimate</p>
              <p className="text-sm text-slate-500 mb-8">
                By signing below, you agree to the services and pricing outlined in this estimate.
                A deposit or confirmation may be required to schedule your appointment.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-b border-slate-300 mb-2 h-10" />
                  <p className="text-xs text-slate-400">Client name (print)</p>
                </div>
                <div>
                  <div className="border-b border-slate-300 mb-2 h-10" />
                  <p className="text-xs text-slate-400">Date</p>
                </div>
                <div className="col-span-2">
                  <div className="border-b border-slate-300 mb-2 h-10" />
                  <p className="text-xs text-slate-400">Signature</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}
