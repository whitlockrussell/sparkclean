'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Appointment, NewAppointment } from '@/lib/types'

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (
          first_name,
          last_name,
          address,
          city,
          notes
        )
      `)
      .neq('status', 'cancelled')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setAppointments(data ?? [])
    }
    setLoading(false)
  }, [])

  const fetchToday = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (
          first_name,
          last_name,
          address,
          city,
          notes
        )
      `)
      .eq('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })

    if (error) return []
    return data ?? []
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const addAppointment = async (appt: NewAppointment) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appt, user_id: user.id }])
      .select(`
        *,
        clients (
          first_name,
          last_name,
          address,
          city,
          notes
        )
      `)
      .single()

    if (error) throw new Error(error.message)
    setAppointments(prev =>
      [...prev, data].sort((a, b) =>
        a.scheduled_date.localeCompare(b.scheduled_date)
      )
    )
    return data
  }

  const updateAppointment = async (id: string, updates: Partial<NewAppointment>) => {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        clients (
          first_name,
          last_name,
          address,
          city,
          notes
        )
      `)
      .single()

    if (error) throw new Error(error.message)
    setAppointments(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  const markDone = async (id: string) => {
    return updateAppointment(id, { status: 'completed' })
  }

  const fetchUnpaid = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (
          first_name,
          last_name,
          address,
          city,
          notes
        )
      `)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: true })
    return data ?? []
  }, [])

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) throw new Error(error.message)
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    setAppointments(prev => prev.filter(a => a.id !== id))
  }

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    markDone,
    cancelAppointment,
    deleteAppointment,
    fetchToday,
    fetchUnpaid,
    refetch: fetchAppointments,
  }
}

