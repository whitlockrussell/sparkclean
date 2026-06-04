import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/today'

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change',
    })
    if (error) {
      const message = error.message.toLowerCase().includes('expired')
        ? 'Your password reset link has expired. Please request a new one.'
        : 'That link is no longer valid. Please try again.'
      return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(message)}`, req.url))
    }
  } else if (code) {
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Link the team_member row to this user's auth account
      await supabase
        .from('team_members')
        .update({ user_id: user.id, invite_accepted: true })
        .eq('email', user.email)
        .is('user_id', null)
    }
  }

  return NextResponse.redirect(new URL(next, req.url))
}