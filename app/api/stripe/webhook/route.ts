import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

// In Stripe API >= 2024-09-30, current_period_end moved from Subscription
// to each SubscriptionItem. Pull it from the first item.
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.items?.data?.[0]?.current_period_end
  if (!ts) return null
  return new Date(ts * 1000).toISOString()
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) {
          console.warn('[stripe/webhook] checkout.session.completed missing user_id metadata')
          break
        }

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        let periodEnd: string | null = null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items'],
          })
          periodEnd = getPeriodEnd(sub)
        }

        const { error } = await adminClient.from('businesses').update({
          plan: 'pro',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          current_period_end: periodEnd,
        }).eq('user_id', userId)

        if (error) console.error('[stripe/webhook] DB update failed (checkout.session.completed):', error)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const { error } = await adminClient.from('businesses').update({
          subscription_status: sub.status,
          current_period_end: getPeriodEnd(sub),
        }).eq('stripe_customer_id', customerId)

        if (error) console.error('[stripe/webhook] DB update failed (subscription.updated):', error)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const { error } = await adminClient.from('businesses').update({
          plan: 'free',
          subscription_status: 'cancelled',
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq('stripe_customer_id', customerId)

        if (error) console.error('[stripe/webhook] DB update failed (subscription.deleted):', error)
        break
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
