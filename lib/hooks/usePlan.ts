'use client'

import { useState, useEffect } from 'react'
import { useBusiness } from './useBusiness'
import { createClient } from '@/lib/supabase/client'

export function usePlan() {
  const { business, loading: businessLoading } = useBusiness()
  const [clientCount, setClientCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setClientCount(count ?? 0))
  }, [])

  const plan = business?.plan ?? 'free'
  const isPro = plan === 'pro'

  return {
    plan,
    isPro,
    clientCount,
    isAtClientLimit: !isPro && clientCount >= 5,
    loading: businessLoading,
    subscriptionStatus: business?.subscription_status ?? null,
    currentPeriodEnd: business?.current_period_end ?? null,
  }
}
