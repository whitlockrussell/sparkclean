'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Printer } from 'lucide-react'

type InvoiceData = {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  subtotal: number
  hst_amount: number
  total: number
  notes: string | null
  paid_at: string | null
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

type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
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
  invoice_notes: string | null
  logo_url: string | null
}

function fmt(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function InvoicePDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [invRes, busRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
          .eq('id', id)
          .single(),
        supabase.from('businesses').select('*').single(),
      ])

      if (invRes.data) {
        setInvoice(invRes.data)
        const { data: itemsData } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', id)
          .order('sort_order')
        setItems(itemsData ?? [])
      }

      if (busRes.data) setBusiness(busRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Loading invoice…</p>
    </div>
  )

  if (!invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Invoice not found.</p>
    </div>
  )

  const client = invoice.clients
  const isPaid = invoice.status === 'paid'

  return (
    <>
      {/* Toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <p className="text-sm font-medium text-slate-700">{invoice.invoice_number}</p>
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

      {/* Invoice */}
      <div className="min-h-screen bg-slate-100 print:bg-white pt-16 print:pt-0 pb-16 print:pb-0">
        <div className="max-w-2xl mx-auto bg-white print:max-w-none shadow-sm print:shadow-none p-10 print:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              {/* Logo */}
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
                {isPaid ? (
                  <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">PAID</span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    {invoice.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold text-slate-900">{invoice.invoice_number}</p>
              <p className="text-sm text-slate-500 mt-1">Issued {fmt(invoice.issue_date)}</p>
              {invoice.due_date && <p className="text-sm text-slate-500">Due {fmt(invoice.due_date)}</p>}
              {invoice.paid_at && <p className="text-sm text-green-600">Paid {fmt(invoice.paid_at)}</p>}
            </div>
          </div>

          {/* Bill to */}
          {client && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill to</p>
              <p className="text-sm font-semibold text-slate-900">{client.first_name} {client.last_name}</p>
              {client.address && <p className="text-sm text-slate-500">{client.address}</p>}
              {client.city && (
                <p className="text-sm text-slate-500">{client.city}, {client.province} {client.postal_code}</p>
              )}
              {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
              {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
            </div>
          )}

          {/* Line items */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Unit price</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3 text-slate-700">{item.description}</td>
                  <td className="py-3 text-center text-slate-500">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-500">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3 text-right text-slate-700 font-medium">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>HST (13%)</span><span>${invoice.hst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total</span><span>${invoice.total.toFixed(2)}</span>
              </div>
              {isPaid && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Amount paid</span><span>${invoice.total.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || business?.invoice_notes) && (
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                {invoice.notes || business?.invoice_notes}
              </p>
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
