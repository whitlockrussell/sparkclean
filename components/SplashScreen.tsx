'use client'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    // Longer splash for PWA launches to match the OS splash handoff
    const holdMs = isPWA ? 1400 : 700

    const fadeTimer = setTimeout(() => setFading(true), holdMs)
    const hideTimer = setTimeout(() => setVisible(false), holdMs + 500)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-teal-500 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-24 h-24 rounded-[28px] bg-white/20 flex items-center justify-center mb-6">
        <Sparkles className="w-12 h-12 text-white" strokeWidth={1.4} />
      </div>
      <h1 className="text-[28px] font-bold text-white tracking-tight">
        Spark<span className="text-teal-200">Clean</span>
      </h1>
      <p className="text-teal-200/80 text-sm mt-2 font-medium">Cleaning made simple</p>
    </div>
  )
}
