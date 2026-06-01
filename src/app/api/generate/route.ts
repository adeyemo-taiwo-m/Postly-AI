import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, buildPlanPrompt, buildContentPrompt, buildSamplePlanPrompt } from '@/lib/ai/prompts'
import { PLAN_LIMITS } from '@/types'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { mode, calendarIdea, extraDetail, businessDescription } = body

  // ── DEMO MODE: no auth required, used on landing page ──
  if (mode === 'demo') {
    if (!businessDescription) {
      return new Response('businessDescription required', { status: 400 })
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      prompt: buildSamplePlanPrompt(businessDescription),
      maxOutputTokens: 600,
    })

    return result.toTextStreamResponse()
  }

  // ── AUTHENTICATED MODES ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check generation limit
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!sub) {
    return new Response('No subscription found', { status: 400 })
  }

  const limit = PLAN_LIMITS[sub.plan as keyof typeof PLAN_LIMITS] ?? 7

  // Only count content generation against limit, not plan generation
  if (mode === 'content' && sub.gen_count >= limit) {
    return new Response(JSON.stringify({ error: 'limit_reached', plan: sub.plan }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile && mode !== 'demo') {
    return new Response('Profile not found', { status: 400 })
  }

  // Increment generation count (for content mode only)
  if (mode === 'content') {
    await supabase
      .from('subscriptions')
      .update({ gen_count: sub.gen_count + 1 })
      .eq('user_id', user.id)
  }

  // ── PLAN GENERATION ──
  if (mode === 'plan') {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: buildSystemPrompt(profile),
      prompt: buildPlanPrompt(profile),
      maxOutputTokens: 900,
    })
    return result.toTextStreamResponse()
  }

  // ── CONTENT GENERATION ──
  if (mode === 'content') {
    if (!calendarIdea) {
      return new Response('calendarIdea required', { status: 400 })
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: buildSystemPrompt(profile),
      prompt: buildContentPrompt(calendarIdea, extraDetail),
      maxOutputTokens: 700,
    })
    return result.toTextStreamResponse()
  }

  return new Response('Invalid mode', { status: 400 })
}
