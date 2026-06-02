'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Business = {
  id: string
  user_id: string
  business_name: string
  hst_number: string | null
  address: string | null
  city: string | null
  province: string
  postal_code: string | null
  phone: string | null
  email: string | null
  website: string | null
  invoice_prefix: string
  invoice_notes: string | null
  hst_rate: number
  hourly_rate: number
  team_mode: boolean
  logo_url: string | null
}

export type BusinessUpdate = Partial<Omit<Business, 'id' | 'user_id'>>

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchBusiness = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      setError(error.message)
    } else {
      setBusiness(data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBusiness() }, [fetchBusiness])

  const saveBusiness = async (updates: BusinessUpdate) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    if (business) {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      setBusiness(data)
      return data
    } else {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{ ...updates, user_id: user.id, business_name: updates.business_name ?? 'My Business' }])
        .select()
        .single()
      if (error) throw new Error(error.message)
      setBusiness(data)
      return data
    }
  }

  return { business, loading, error, saveBusiness, refetch: fetchBusiness }
}