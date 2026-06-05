'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'

const inputClass = 'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // null = still checking, true = session ready, false = no valid session
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const router = useRouter()
  // Create once so the same instance is used for both session detection and updateUser
  const supabase = useRef(createClient()).current

  useEffect(() => {
    let settled = false

    // If no session event arrives within 4 seconds, the link is expired/invalid
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        setSessionReady(false)
      }
    }, 4000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires when the client loads and finds a session in cookies
      // (this is the normal path after the server-side /auth/callback sets the cookie)
      // PASSWORD_RECOVERY fires when Supabase processes a hash-fragment recovery token
      if (session && (event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          setSessionReady(true)
        }
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session in cookies yet — keep waiting for PASSWORD_RECOVERY (hash flow)
        // The timeout above will fire if nothing arrives
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase])

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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/today')
    }
  }

  if (sessionReady === null) {
    return (
      <AuthShell subtitle="Choose a new password">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthShell>
    )
  }

  if (sessionReady === false) {
    return (
      <AuthShell subtitle="Link expired">
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-500">
            This password reset link has expired or has already been used. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Request new link
          </Link>
        </div>
      </AuthShell>
    )
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
            style={{ backgroundColor: 'white', color: '#111827' }}
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
            style={{ backgroundColor: 'white', color: '#111827' }}
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
