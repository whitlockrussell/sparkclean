interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`px-4 lg:px-6 py-5 max-w-2xl mx-auto lg:max-w-4xl page-enter ${className}`}>
      {children}
    </div>
  )
}