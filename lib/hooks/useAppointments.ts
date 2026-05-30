'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Appointment, NewAppointment } from '@/lib/types'

const CLIENT_SELECT = `*, clients(first_name, last_name, address, city, notes)`

function generateOccurrenceDates(
  start: string,
  rule: 'weekly' | 'biweekly' | 'monthly',
  end: string | null,
): string[] {
  const [sy, sm, sd] = start.split('-').map(Number)
  let cur = new Date(sy, sm - 1, sd)
  const endDate = end
    ? (() => { const [y, m, d] = end.split('-').map(Number); return new Date(y, m - 1, d) })()
    : new Date(sy + 1, sm - 1, sd) // default 1 year ahead
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const dates: string[] = []
  while (cur <= endDate && dates.length < 52) {
    dates.push(fmt(cur))
    if (rule === 'weekly')    cur.setDate(cur.getDate() + 7)
    else if (rule === 'biweekly') cur.setDate(cur.getDate() + 14)
    else cur.setMonth(cur.getMonth() + 1)
  }
  return dates
}

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

    if (appt.is_recurring && appt.recurrence_rule) {
      const dates = generateOccurrenceDates(appt.scheduled_date, appt.recurrence_rule, appt.recurrence_end ?? null)
      const records = dates.map(date => ({ ...appt, user_id: user.id, scheduled_date: date }))
      const { data, error } = await supabase.from('appointments').insert(records).select(CLIENT_SELECT)
      if (error) throw new Error(error.message)
      const newAppts = (data ?? []) as Appointment[]
      setAppointments(prev =>
        [...prev, ...newAppts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      )
      return newAppts[0] ?? null
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appt, user_id: user.id }])
      .select(CLIENT_SELECT)
      .single()

    if (error) throw new Error(error.message)
    setAppointments(prev =>
      [...prev, data].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
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

