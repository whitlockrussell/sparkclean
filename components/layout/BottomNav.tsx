'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/lib/nav'
import { useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'

const mainItems = navItems
  .sort((a, b) => a.mobileOrder - b.mobileOrder)
  .slice(0, 4)

const moreItems = navItems
  .sort((a, b) => a.mobileOrder - b.mobileOrder)
  .slice(4)

export function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = moreItems.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowMore(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-2xl px-4 pt-4 pb-8 safe-area-pb"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">More</p>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-colors ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-pb">
        <div className="flex items-stretch">
          {mainItems.map((item) => {
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
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
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

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px]
              transition-colors duration-150
              ${isMoreActive ? 'text-teal-600' : 'text-slate-400'}
            `}
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2.2 : 1.8} />
              {isMoreActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-teal-500 rounded-full" />
              )}
            </div>
            <span className={`text-[10px] font-medium tracking-wide ${isMoreActive ? 'text-teal-600' : 'text-slate-400'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
