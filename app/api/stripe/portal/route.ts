import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  const customerId = business?.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
