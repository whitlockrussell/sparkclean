'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client, NewClient } from '@/lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('active', true)
      .order('first_name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const addClient = async (client: NewClient) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...client, user_id: user.id }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    setClients(prev => [...prev, data].sort((a, b) =>
      a.first_name.localeCompare(b.first_name)
    ))
    return data
  }

  const updateClient = async (id: string, updates: Partial<NewClient>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setClients(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  const archiveClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ active: false })
      .eq('id', id)

    if (error) throw new Error(error.message)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  return { clients, loading, error, addClient, updateClient, archiveClient, refetch: fetchClients }
}