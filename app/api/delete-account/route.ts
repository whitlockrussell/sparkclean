import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const uid = user.id

  // invoice_items has no user_id — delete via invoice FK first
  const { data: invoices } = await admin.from('invoices').select('id').eq('user_id', uid)
  if (invoices?.length) {
    await admin.from('invoice_items').delete().in('invoice_id', invoices.map(i => i.id))
  }

  const tables = [
    'appointments',
    'clients',
    'invoices',
    'expenses',
    'mileage_logs',
    'estimates',
    'time_entries',
    'hours_log',
    'team_members',
    'businesses',
  ] as const

  for (const table of tables) {
    await admin.from(table).delete().eq('user_id', uid)
  }

  await admin.auth.admin.deleteUser(uid)

  return NextResponse.json({ ok: true })
}
