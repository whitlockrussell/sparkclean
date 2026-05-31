'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TeamMember = {
  id: string
  owner_id: string
  user_id: string | null
  full_name: string
  email: string
  role: string
  active: boolean
  invite_sent_at: string | null
  invite_accepted: boolean
  permissions: {
    view_today: boolean
    view_schedule: boolean
    mark_job_done: boolean
    view_address: boolean
    view_contact_info: boolean
    view_job_notes: boolean
    view_own_hours: boolean
    view_job_price: boolean
    view_invoices: boolean
    view_expenses: boolean
    can_clock_self: boolean
    can_edit_hours: boolean
  }
  created_at: string
}

export type HoursLog = {
  id: string
  owner_id: string
  team_member_id: string
  appointment_id: string | null
  hours: number
  work_date: string
  notes: string | null
  created_at: string
  team_members?: { full_name: string }
}

export type TimeEntry = {
  id: string
  owner_id: string
  team_member_id: string
  clock_in: string
  clock_out: string | null
  hours: number | null
  work_date: string
  notes: string | null
  team_members?: { full_name: string }
}

export type NewHoursLog = {
  team_member_id: string
  appointment_id?: string | null
  hours: number
  work_date: string
  notes?: string | null
}

const defaultPermissions = {
  view_today: true,
  view_schedule: true,
  mark_job_done: true,
  view_address: true,
  view_contact_info: false,
  view_job_notes: true,
  view_own_hours: true,
  view_job_price: false,
  view_invoices: false,
  view_expenses: false,
  can_clock_self: false,
  can_edit_hours: false,
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [hoursLog, setHoursLog] = useState<HoursLog[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setMembers(data ?? [])
    setLoading(false)
  }, [])

  const fetchHours = useCallback(async (weekStart?: string) => {
    const start = weekStart ?? getWeekStart()
    const end = getWeekEnd(start)

    const { data: hoursData } = await supabase
      .from('hours_log')
      .select('*, team_members(full_name)')
      .gte('work_date', start)
      .lte('work_date', end)
      .order('work_date', { ascending: true })

    const { data: timeData } = await supabase
      .from('time_entries')
      .select('*, team_members(full_name)')
      .gte('work_date', start)
      .lte('work_date', end)
      .order('clock_in', { ascending: true })

    setHoursLog(hoursData ?? [])
    setTimeEntries(timeData ?? [])
    return { hoursLog: hoursData ?? [], timeEntries: timeData ?? [] }
  }, [])

  useEffect(() => {
    fetchTeam()
    fetchHours()
  }, [fetchTeam, fetchHours])

  const inviteMember = async (fullName: string, email: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { data, error } = await supabase
      .from('team_members')
      .insert([{
        owner_id: user.id,
        full_name: fullName,
        email,
        permissions: defaultPermissions,
        invite_sent_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    setMembers(prev => [...prev, data])

    await fetch('/api/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName }),
    })

    return data
  }

  const updatePermissions = async (memberId: string, permissions: TeamMember['permissions']) => {
    const { data, error } = await supabase
      .from('team_members')
      .update({ permissions })
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setMembers(prev => prev.map(m => m.id === memberId ? data : m))
    return data
  }

  const deactivateMember = async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .update({ active: false })
      .eq('id', memberId)

    if (error) throw new Error(error.message)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const logHours = async (entry: NewHoursLog) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { data, error } = await supabase
      .from('hours_log')
      .insert([{ ...entry, owner_id: user.id }])
      .select('*, team_members(full_name)')
      .single()

    if (error) throw new Error(error.message)
    setHoursLog(prev => [...prev, data])
    return data
  }

  const deleteHours = async (id: string) => {
    const { error } = await supabase.from('hours_log').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setHoursLog(prev => prev.filter(h => h.id !== id))
  }

  const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTimeEntries(prev => prev.filter(e => e.id !== id))
  }

  const logTimeEntry = async (
    memberId: string,
    date: string,
    startTime: string,
    endTime: string,
    notes?: string | null,
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const clockIn  = `${date}T${startTime}:00`
    const clockOut = `${date}T${endTime}:00`
    const diffMs   = new Date(clockOut).getTime() - new Date(clockIn).getTime()
    const hours    = Math.max(0, Math.round((diffMs / 3_600_000) * 4) / 4)

    const { data, error } = await supabase
      .from('time_entries')
      .insert([{
        owner_id: user.id,
        team_member_id: memberId,
        clock_in: clockIn,
        clock_out: clockOut,
        hours,
        work_date: date,
        notes: notes ?? null,
      }])
      .select('*, team_members(full_name)')
      .single()

    if (error) throw new Error(error.message)
    setTimeEntries(prev =>
      [...prev, data].sort((a, b) => a.work_date.localeCompare(b.work_date) || a.clock_in.localeCompare(b.clock_in))
    )
    return data
  }

  const editTimeEntry = async (id: string, clockIn: string, clockOut: string) => {
    const { data, error } = await supabase
      .from('time_entries')
      .update({ clock_in: clockIn, clock_out: clockOut })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setTimeEntries(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  return {
    members, hoursLog, timeEntries, loading, error,
    inviteMember, updatePermissions, deactivateMember,
    logHours, deleteHours, logTimeEntry, deleteTimeEntry, editTimeEntry,
    fetchTeam, fetchHours,
  }
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function getWeekEnd(weekStart: string) {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export function formatWeekLabel(weekStart: string) {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  return `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`
}
