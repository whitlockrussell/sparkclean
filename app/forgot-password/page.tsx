'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'

const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-slate-400'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <AuthShell subtitle="Reset your password">
      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Check your email</p>
            <p className="text-sm text-slate-500">
              We sent a reset link to <strong>{email}</strong>. Click it to set a new password.
            </p>
          </div>
          <Link href="/login" className="block text-sm text-teal-600 hover:text-teal-700 transition-colors mt-4">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-5">
            Enter the email address for your account and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link href="/login" className="text-teal-600 hover:text-teal-700 transition-colors">
              ← Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
