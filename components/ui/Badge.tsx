interface BadgeProps {
  children: React.ReactNode
  variant?: 'teal' | 'amber' | 'red' | 'gray' | 'green'
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const variants = {
    teal:  'bg-teal-50 text-teal-700 border border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red:   'bg-red-50 text-red-600 border border-red-200',
    gray:  'bg-slate-100 text-slate-600 border border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}