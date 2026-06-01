import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Use service role for webhook handler (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  switch (event.event) {
    case 'subscription.create': {
      const { customer, subscription_code, plan } = event.data
      // Find user by email
      const { data: userData } = await supabase.auth.admin.listUsers()
      const user = userData?.users?.find(u => u.email === customer.email)

      if (user) {
        const planName = getPlanNameFromPaystackCode(plan.plan_code)
        await supabase.from('subscriptions').update({
          plan: planName,
          paystack_sub_id: subscription_code,
          status: 'active',
          gen_count: 0,
          period_start: new Date().toISOString(),
        }).eq('user_id', user.id)
      }
      break
    }

    case 'invoice.payment_failed':
    case 'subscription.not_renew': {
      const { subscription_code } = event.data
      await supabase.from('subscriptions').update({
        status: 'expired',
        plan: 'free',
      }).eq('paystack_sub_id', subscription_code)
      break
    }

    case 'subscription.disable': {
      const { subscription_code } = event.data
      await supabase.from('subscriptions').update({
        status: 'cancelled',
        plan: 'free',
      }).eq('paystack_sub_id', subscription_code)
      break
    }

    // Reset gen_count at start of new billing period
    case 'invoice.update': {
      if (event.data.paid) {
        const { subscription } = event.data
        await supabase.from('subscriptions').update({
          gen_count: 0,
          period_start: new Date().toISOString(),
        }).eq('paystack_sub_id', subscription.subscription_code)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

function getPlanNameFromPaystackCode(planCode: string): string {
  // Map your Paystack plan codes to internal plan names
  // Set these up in your Paystack dashboard and hardcode the codes here
  const planMap: Record<string, string> = {
    'PLN_beta_code_here': 'beta',
    'PLN_starter_code_here': 'starter',
    'PLN_growth_code_here': 'growth',
  }
  return planMap[planCode] || 'starter'
}
