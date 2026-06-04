'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'

const inputClass = 'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const notice = searchParams.get('message')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)

      if (members && members.length > 0) {
        router.push('/member')
        return
      }
    }

    router.push('/today')
  }

  return (
    <AuthShell subtitle="Sign in to your account">
      {notice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-2.5 mb-4">
          {notice}
        </div>
      )}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={inputClass}
            placeholder="you@example.com"
            style={{ backgroundColor: 'white', color: '#111827' }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-500">Password</label>
            <Link href="/forgot-password" className="text-xs text-teal-600 hover:text-teal-700 transition-colors">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
          Sign up free
        </Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
