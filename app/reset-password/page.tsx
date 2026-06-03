'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'

const inputClass = 'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/today')
    }
  }

  return (
    <AuthShell subtitle="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
