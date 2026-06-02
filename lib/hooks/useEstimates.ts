'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Estimate } from '@/lib/types'

export type NewEstimate = {
  client_id: string
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
}

export function useEstimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchEstimates = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('estimates')
      .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setEstimates(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEstimates() }, [fetchEstimates])

  const createEstimate = async (estimate: NewEstimate) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { count } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const estimateNumber = `EST-${String((count ?? 0) + 1).padStart(3, '0')}`

    const issueDate = new Date().toISOString().split('T')[0]
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: est, error: estError } = await supabase
      .from('estimates')
      .insert([{
        user_id: user.id,
        client_id: estimate.client_id,
        estimate_number: estimateNumber,
        status: 'pending',
        issue_date: issueDate,
        valid_until: validUntil,
        property_type: estimate.property_type,
        size: estimate.size,
        bedrooms: estimate.bedrooms,
        bathrooms: estimate.bathrooms,
        clean_type: estimate.clean_type,
        frequency: estimate.frequency,
        extras: estimate.extras,
        notes: estimate.notes,
        hourly_rate: estimate.hourly_rate,
        estimated_hours: estimate.estimated_hours,
        subtotal: estimate.subtotal,
        hst_amount: estimate.hst_amount,
        total: estimate.total,
      }])
      .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
      .single()

    if (estError) throw new Error(estError.message)

    setEstimates(prev => [est, ...prev])
    return est
  }

  const markAccepted = async (id: string) => {
    const { data, error } = await supabase
      .from('estimates')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
      .single()

    if (error) throw new Error(error.message)
    setEstimates(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const markDeclined = async (id: string) => {
    const { data, error } = await supabase
      .from('estimates')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
      .single()

    if (error) throw new Error(error.message)
    setEstimates(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const markPending = async (id: string) => {
    const { data, error } = await supabase
      .from('estimates')
      .update({ status: 'pending', accepted_at: null, declined_at: null })
      .eq('id', id)
      .select(`*, clients(first_name, last_name, email, phone, address, city, province, postal_code)`)
      .single()

    if (error) throw new Error(error.message)
    setEstimates(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteEstimate = async (id: string) => {
    const { error } = await supabase.from('estimates').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setEstimates(prev => prev.filter(e => e.id !== id))
  }

  return {
    estimates, loading, error,
    createEstimate, markAccepted, markDeclined, markPending, deleteEstimate,
    refetch: fetchEstimates,
  }
}
