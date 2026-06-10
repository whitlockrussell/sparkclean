'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '@/lib/types'

export type NewInvoice = {
  client_id: string
  appointment_id?: string | null
  due_date?: string | null
  notes?: string | null
  payment_method?: 'cash' | 'e_transfer' | 'cheque' | null
  items: { description: string; quantity: number; unit_price: number }[]
  tax_rate: number      // percentage, e.g. 13
  tax_enabled: boolean
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('invoices')
      .select(`*, clients(first_name, last_name, email)`)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setInvoices(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const createInvoice = async (invoice: NewInvoice) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(3, '0')}`

    const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const hstAmount = invoice.tax_enabled ? Math.round(subtotal * (invoice.tax_rate / 100) * 100) / 100 : 0
    const total = Math.round((subtotal + hstAmount) * 100) / 100

    const { data: inv, error: invError } = await supabase
      .from('invoices')
      .insert([{
        user_id: user.id,
        client_id: invoice.client_id,
        appointment_id: invoice.appointment_id ?? null,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: invoice.due_date ?? null,
        subtotal,
        hst_amount: hstAmount,
        total,
        tax_rate: invoice.tax_rate,
        tax_enabled: invoice.tax_enabled,
        notes: invoice.notes ?? null,
        payment_method: invoice.payment_method ?? null,
      }])
      .select(`*, clients(first_name, last_name, email)`)
      .single()

    if (invError) throw new Error(invError.message)

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        invoice.items.map((item, i) => ({
          invoice_id: inv.id,
          user_id: user.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Math.round(item.quantity * item.unit_price * 100) / 100,
          sort_order: i,
        }))
      )

    if (itemsError) throw new Error(itemsError.message)

    setInvoices(prev => [inv, ...prev])
    return inv
  }

  const markPaid = async (id: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString().split('T')[0] })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email)`)
      .single()

    if (error) throw new Error(error.message)
    setInvoices(prev => prev.map(inv => inv.id === id ? data : inv))
    return data
  }

  const markUnpaid = async (id: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent', paid_at: null })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email)`)
      .single()

    if (error) throw new Error(error.message)
    setInvoices(prev => prev.map(inv => inv.id === id ? data : inv))
    return data
  }

  const markSent = async (id: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email)`)
      .single()

    if (error) throw new Error(error.message)
    setInvoices(prev => prev.map(inv => inv.id === id ? data : inv))
    return data
  }

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setInvoices(prev => prev.filter(inv => inv.id !== id))
  }

  return {
    invoices, loading, error,
    createInvoice, markPaid, markUnpaid, markSent, deleteInvoice,
    refetch: fetchInvoices,
  }
}