'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/lib/nav'

// Show only top 5 on mobile bottom bar
const mobileNavItems = navItems
  .sort((a, b) => a.mobileOrder - b.mobileOrder)
  .slice(0, 5)

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-pb">
      <div className="flex items-stretch">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px]
                transition-colors duration-150
                ${active ? 'text-teal-600' : 'text-slate-400'}
              `}
            >
              {/* Active dot indicator */}
              <div className="relative">
                <Icon
                  className="w-5 h-5"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-500 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-teal-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
