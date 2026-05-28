'use client'

import { Bell } from 'lucide-react'

interface TopHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function TopHeader({ title, subtitle, action }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-slate-400 truncate leading-tight">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {action}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  )
}