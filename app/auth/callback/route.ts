import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
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

  const next = searchParams.get('next') ?? '/today'
  return NextResponse.redirect(new URL(next, req.url))
}