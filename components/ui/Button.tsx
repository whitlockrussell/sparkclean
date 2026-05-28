interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:   'bg-teal-500 hover:bg-teal-600 text-white shadow-sm active:bg-teal-700',
    secondary: 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200',
    ghost:     'bg-transparent hover:bg-slate-100 text-slate-600',
    danger:    'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-5 py-3.5 text-[15px] rounded-xl gap-2 min-h-[52px]',
  }

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading…
        </>
      ) : children}
    </button>
  )
}
