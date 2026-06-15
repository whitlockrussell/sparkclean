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
    .select('stripe_customer_id, business_name, email')
    .eq('user_id', user.id)
    .single()

  let customerId = business?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: business?.email ?? user.email ?? undefined,
      name: business?.business_name ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${appUrl}/settings?upgraded=1`,
    cancel_url: `${appUrl}/upgrade`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
