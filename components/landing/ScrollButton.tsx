'use client'

export function ScrollButton() {
  return (
    <button
      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
      className="w-full sm:w-auto border border-white/60 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
    >
      See how it works
    </button>
  )
}
