import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_LIMITS } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const limit = PLAN_LIMITS[data.plan as keyof typeof PLAN_LIMITS] ?? 7
  const remaining = Math.max(0, limit - data.gen_count)

  return NextResponse.json({
    subscription: data,
    limit,
    remaining,
    isAtLimit: remaining === 0,
  })
}
