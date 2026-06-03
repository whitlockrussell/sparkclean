'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from './Button'

interface UpgradePromptProps {
  feature: string
  description?: string
  mode?: 'page' | 'banner'
}

export function UpgradePrompt({ feature, description, mode = 'page' }: UpgradePromptProps) {
  if (mode === 'banner') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2.5">
        <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
        <span className="flex-1">{feature} requires Pro</span>
        <Link
          href="/upgrade"
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap"
        >
          Upgrade →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-amber-500" strokeWidth={1.8} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {feature} is a Pro feature
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">
        {description ?? 'Upgrade to Pro to unlock this feature and everything else SparkClean has to offer.'}
      </p>
      <Link href="/upgrade">
        <Button size="lg">
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Button>
      </Link>
      <p className="text-xs text-slate-400 mt-3">$19 CAD / month · Cancel anytime</p>
    </div>
  )
}
