'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { usePlan } from '@/lib/hooks/usePlan'
import { Check, Sparkles, Lock } from 'lucide-react'

const FREE_FEATURES = [
  'Up to 5 clients',
  'Unlimited jobs & scheduling',
  'Invoices (no PDF download)',
  'Expense tracking (no AI scan)',
  'Basic HST reports',
]

const PRO_FEATURES = [
  'Unlimited clients',
  'PDF invoice downloads',
  'AI receipt scanning',
  'PDF reports & exports',
  'Weekly calendar view',
  'Recurring jobs',
  'Mileage tracker (CRA deductions)',
  'Team management',
  'Estimates & quotes',
]

export default function UpgradePage() {
  const { isPro } = usePlan()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (isPro) {
    return (
      <AppShell>
        <TopHeader title="Upgrade" />
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              You&apos;re already on Pro!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All features are unlocked. Manage your subscription in Settings.
            </p>
          </div>
        </PageContainer>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <TopHeader title="Upgrade to Pro" subtitle="$19 CAD / month" />
      <PageContainer>

        <div className="grid gap-4 mb-6 sm:grid-cols-2">
          {/* Free plan */}
          <Card className="p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Free</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">$0</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">forever</p>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
          </Card>

          {/* Pro plan */}
          <Card className="p-5 border-teal-300 dark:border-teal-700 ring-1 ring-teal-300 dark:ring-teal-700">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Pro</p>
                <span className="text-[10px] font-semibold text-white bg-teal-500 rounded-full px-2 py-0.5">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">$19</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">CAD per month</p>
            </div>
            <ul className="space-y-2.5 mb-5">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <Button size="lg" className="w-full" loading={loading} onClick={handleUpgrade}>
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro
            </Button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
              Secure payment via Stripe · Cancel anytime
            </p>
          </Card>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Currently locked on your plan
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mileage tracker, Team management, Estimates, PDF downloads, AI receipt scanning, weekly calendar view, and recurring jobs are all available on Pro.
          </p>
        </div>

      </PageContainer>
    </AppShell>
  )
}
