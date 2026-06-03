'use client'

import Link from 'next/link'
import { Sparkles, Check, ArrowLeft } from 'lucide-react'

const BULLETS = [
  'Schedule jobs and send invoices in seconds',
  'Track expenses and mileage for tax time',
  'Works on any phone — no app store needed',
  'Built for Canadian HST and CRA reporting',
]

interface AuthShellProps {
  subtitle: string
  children: React.ReactNode
}

export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel (desktop only) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-teal-600 text-white flex-col justify-between p-12 xl:p-16">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">SparkClean</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-6">
            Your entire cleaning business,<br />run from your phone.
          </h1>
          <p className="text-teal-100 text-base mb-10 leading-relaxed">
            The simple app that solo cleaners and small teams use to stay organized, look professional, and get paid faster.
          </p>

          {/* Bullets */}
          <ul className="space-y-3.5">
            {BULLETS.map(b => (
              <li key={b} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-teal-50 text-sm leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="text-teal-200 text-xs">
          Free to start · No credit card required
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white min-h-screen">

        {/* Back to home link */}
        <div className="p-5 lg:p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-[15px]">
                Spark<span className="text-teal-500">Clean</span>
              </span>
            </div>

            <h1 className="text-2xl font-semibold text-gray-800 mb-6">{subtitle}</h1>

            {children}
          </div>
        </div>
      </div>

    </div>
  )
}
