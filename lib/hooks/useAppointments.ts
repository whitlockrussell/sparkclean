'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Appointment, NewAppointment } from '@/lib/types'

const CLIENT_SELECT = `*, clients(first_name, last_name, address, city, notes)`

function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateOccurrenceDates(
  start: string,
  rule: 'weekly' | 'biweekly' | 'monthly',
  end: string | null,
): string[] {
  console.log('[recurring] generateOccurrenceDates called — start:', start, 'rule:', rule, 'end:', end)
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
  console.log('[recurring] generated', dates.length, 'dates — first:', dates[0], 'last:', dates[dates.length - 1])
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
    const today = new Date()
    const windowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90)
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
      .gte('scheduled_date', localDateStr(today))
      .lte('scheduled_date', localDateStr(windowEnd))
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
    const today = localDateStr()
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
      console.log('[recurring] inserting', dates.length, 'records into Supabase')
      const records = dates.map(date => ({ ...appt, user_id: user.id, scheduled_date: date }))
      const { data, error } = await supabase.from('appointments').insert(records).select(CLIENT_SELECT)
      console.log('[recurring] insert result — inserted:', data?.length ?? 0, 'error:', error?.message ?? null)
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

  // Convert a single non-recurring appointment into the first occurrence of a
  // recurring series. Updates the existing row and bulk-inserts all future dates.
  const convertToRecurring = async (id: string, data: NewAppointment) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')
    if (!data.recurrence_rule) throw new Error('recurrence_rule is required')

    // Update the existing row to be the first occurrence
    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update({ ...data, is_recurring: true })
      .eq('id', id)
      .select(CLIENT_SELECT)
      .single()
    if (updateErr) throw new Error(updateErr.message)

    // Generate all dates, skip the first (the existing row covers it)
    const dates = generateOccurrenceDates(data.scheduled_date, data.recurrence_rule, data.recurrence_end ?? null)
    const future = dates.slice(1).map(date => ({
      ...data,
      user_id: user.id,
      scheduled_date: date,
      is_recurring: true,
      status: 'scheduled' as const,
    }))

    if (future.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('appointments')
        .insert(future)
        .select(CLIENT_SELECT)
      if (insertErr) throw new Error(insertErr.message)
      const newAppts = (inserted ?? []) as Appointment[]
      setAppointments(prev =>
        [...prev.map(a => (a.id === id ? updated : a)), ...newAppts]
          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      )
    } else {
      setAppointments(prev => prev.map(a => (a.id === id ? updated : a)))
    }
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

  const moveFutureAppointments = async (
    clientId: string,
    originalDate: string,
    newDate: string,
    newTime: string,
    extraUpdates: Partial<NewAppointment> = {},
  ) => {
    const parse = (ds: string) => {
      const [y, m, d] = ds.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const deltaDays = Math.round(
      (parse(newDate).getTime() - parse(originalDate).getTime()) / 86400000
    )

    // Fetch every future occurrence for this recurring series (no join — plain columns only)
    const { data: rows, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_recurring', true)
      .gte('scheduled_date', originalDate)
      .neq('status', 'cancelled')

    if (fetchErr) throw new Error(fetchErr.message)
    if (!rows?.length) return

    // Shift each occurrence's date by deltaDays; apply time and any extra field updates
    const shifted = rows.map(r => {
      const [ry, rm, rd] = r.scheduled_date.split('-').map(Number)
      return {
        ...r,
        ...extraUpdates,
        scheduled_date: fmt(new Date(ry, rm - 1, rd + deltaDays)),
        start_time: newTime,
      }
    })

    const { data, error } = await supabase
      .from('appointments')
      .upsert(shifted)
      .select(CLIENT_SELECT)

    if (error) throw new Error(error.message)

    const updated = (data ?? []) as Appointment[]
    setAppointments(prev => {
      const ids = new Set(updated.map(a => a.id))
      return [...prev.filter(a => !ids.has(a.id)), ...updated]
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    })
  }

  const deleteFutureAppointments = async (clientId: string, fromDate: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('client_id', clientId)
      .eq('is_recurring', true)
      .gte('scheduled_date', fromDate)

    if (error) throw new Error(error.message)
    setAppointments(prev =>
      prev.filter(a => !(a.client_id === clientId && a.is_recurring && a.scheduled_date >= fromDate))
    )
  }

  const updateFutureAppointments = async (
    clientId: string,
    fromDate: string,
    updates: Partial<NewAppointment>,
  ) => {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('client_id', clientId)
      .eq('is_recurring', true)
      .gte('scheduled_date', fromDate)
      .neq('status', 'cancelled')
      .select(CLIENT_SELECT)

    if (error) throw new Error(error.message)
    const updated = (data ?? []) as Appointment[]
    setAppointments(prev => {
      if (updated.length > 0) {
        const ids = new Set(updated.map(a => a.id))
        return [...prev.filter(a => !ids.has(a.id)), ...updated]
          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      }
      // Supabase returned no rows — apply updates directly from filter criteria to avoid phantoms
      return prev.map(a =>
        a.client_id === clientId && a.is_recurring && a.scheduled_date >= fromDate && a.status !== 'cancelled'
          ? { ...a, ...updates }
          : a
      )
    })
  }

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    convertToRecurring,
    updateFutureAppointments,
    moveFutureAppointments,
    deleteFutureAppointments,
    markDone,
    cancelAppointment,
    deleteAppointment,
    fetchToday,
    fetchUnpaid,
    refetch: fetchAppointments,
  }
}

