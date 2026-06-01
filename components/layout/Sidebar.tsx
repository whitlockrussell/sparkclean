'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/lib/nav'
import { Sparkles } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed left-0 top-0 z-30">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 dark:text-white text-[15px] tracking-tight">
          Spark<span className="text-teal-500">Clean</span>
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom user section */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-teal-700">R</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">My Business</p>
            <p className="text-[11px] text-slate-400 truncate">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
