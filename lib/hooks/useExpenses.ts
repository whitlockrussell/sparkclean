'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Expense, NewExpense } from '@/lib/types'

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (error) setError(error.message)
    else setExpenses(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const addExpense = async (expense: NewExpense) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, user_id: user.id }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    setExpenses(prev => [data, ...prev])
    return data
  }

  const updateExpense = async (id: string, updates: Partial<NewExpense>) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    setExpenses(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return { expenses, loading, error, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses }
}