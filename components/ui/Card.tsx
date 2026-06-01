'use client'
interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm'
  const interactive = onClick ? 'cursor-pointer hover:border-teal-200 hover:shadow-md transition-all duration-150 active:scale-[0.99]' : ''

  return (
    <div
      className={`${base} ${interactive} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
