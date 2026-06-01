import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId, completed, generation_id } = await req.json()

  // Get the plan
  const { data: plan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Update the specific item within the items JSONB array
  const updatedItems = plan.items.map((item: any) => {
    if (item.id === itemId) {
      return {
        ...item,
        ...(completed !== undefined && { completed }),
        ...(generation_id !== undefined && { generation_id }),
      }
    }
    return item
  })

  const { data, error } = await supabase
    .from('plans')
    .update({ items: updatedItems })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plan: data })
}
