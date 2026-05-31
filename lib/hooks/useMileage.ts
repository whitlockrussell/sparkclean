'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MileageLog, NewMileageLog } from '@/lib/types'

// 2025 CRA automobile allowance rates
export const CRA_RATE_TIER1 = 0.72  // $/km for the first 5,000 km
export const CRA_RATE_TIER2 = 0.66  // $/km after 5,000 km
export const CRA_KM_THRESHOLD = 5000

// Calculate total deduction for a set of logs. Logs sorted by date so the
// running km total correctly determines when the tier threshold is crossed.
export function calcDeduction(logs: MileageLog[]): number {
  const sorted = [...logs].sort((a, b) => a.trip_date.localeCompare(b.trip_date))
  let priorKm = 0
  let deduction = 0
  for (const log of sorted) {
    const tier1 = Math.min(log.km, Math.max(0, CRA_KM_THRESHOLD - priorKm))
    const tier2 = log.km - tier1
    deduction += tier1 * CRA_RATE_TIER1 + tier2 * CRA_RATE_TIER2
    priorKm += log.km
  }
  return deduction
}

// Per-trip deduction given prior annual km already driven.
export function tripDeduction(km: number, priorKm: number): number {
  const tier1 = Math.min(km, Math.max(0, CRA_KM_THRESHOLD - priorKm))
  const tier2 = km - tier1
  return tier1 * CRA_RATE_TIER1 + tier2 * CRA_RATE_TIER2
}

export function useMileage() {
  const [logs, setLogs] = useState<MileageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLogs = useCallback(async (start?: string, end?: string) => {
    setLoading(true)
    setError(null)
    let q = supabase.from('mileage_logs').select('*')
    if (start) q = q.gte('trip_date', start)
    if (end)   q = q.lte('trip_date', end)
    const { data, error } = await q.order('trip_date', { ascending: false })
    if (error) setError(error.message)
    else setLogs(data ?? [])
    setLoading(false)
    return data ?? []
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addLog = async (log: NewMileageLog) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')
    const { data, error } = await supabase
      .from('mileage_logs')
      .insert([{ ...log, user_id: user.id }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    setLogs(prev => [data, ...prev].sort((a, b) => b.trip_date.localeCompare(a.trip_date)))
    return data
  }

  const updateLog = async (id: string, updates: Partial<NewMileageLog>) => {
    const { data, error } = await supabase
      .from('mileage_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setLogs(prev => prev.map(l => l.id === id ? data : l))
    return data
  }

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('mileage_logs').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  return { logs, loading, error, addLog, updateLog, deleteLog, refetch: fetchLogs }
}
