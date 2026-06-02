import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  accent?: 'teal' | 'amber' | 'red' | 'slate'
  sub?: string
}

export function StatCard({ label, value, icon: Icon, accent = 'teal', sub }: StatCardProps) {
  const accents = {
    teal:  { bg: 'bg-teal-50 dark:bg-teal-900/30',   icon: 'text-teal-500',  value: 'text-teal-700 dark:text-teal-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30',  icon: 'text-amber-500', value: 'text-amber-700 dark:text-amber-400' },
    red:   { bg: 'bg-red-50 dark:bg-red-900/30',      icon: 'text-red-400',   value: 'text-red-600 dark:text-red-400' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-800',    icon: 'text-slate-400', value: 'text-slate-700 dark:text-slate-300' },
  }

  const a = accents[accent]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${a.icon}`} strokeWidth={2} />
        </div>
      </div>
      <p className={`text-2xl font-semibold leading-none ${a.value}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">{sub}</p>}
    </div>
  )
}