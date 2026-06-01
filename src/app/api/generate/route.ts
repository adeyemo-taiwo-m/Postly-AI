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

    const isPlaceholder = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key'

    if (isPlaceholder) {
      return new Response(getMockPlan(businessDescription))
    }

    try {
      const result = streamText({
        model: openai('gpt-4o-mini'),
        prompt: buildSamplePlanPrompt(businessDescription),
        maxOutputTokens: 600,
      })

      return result.toTextStreamResponse()
    } catch (err) {
      console.warn('OpenAI stream failed, falling back to mock:', err)
      return new Response(getMockPlan(businessDescription))
    }
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
    const isPlaceholder = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key'

    if (isPlaceholder) {
      const description = `${profile?.industry} - ${profile?.what_sells}`
      return new Response(getMockPlan(description))
    }

    try {
      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: buildSystemPrompt(profile),
        prompt: buildPlanPrompt(profile),
        maxOutputTokens: 900,
      })
      return result.toTextStreamResponse()
    } catch (err) {
      console.warn('OpenAI plan stream failed, falling back to mock:', err)
      const description = `${profile?.industry} - ${profile?.what_sells}`
      return new Response(getMockPlan(description))
    }
  }

  // ── CONTENT GENERATION ──
  if (mode === 'content') {
    if (!calendarIdea) {
      return new Response('calendarIdea required', { status: 400 })
    }

    const isPlaceholder = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key'

    if (isPlaceholder) {
      return new Response(getMockContent(calendarIdea, extraDetail, profile))
    }

    try {
      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: buildSystemPrompt(profile),
        prompt: buildContentPrompt(calendarIdea, extraDetail),
        maxOutputTokens: 700,
      })
      return result.toTextStreamResponse()
    } catch (err) {
      console.warn('OpenAI content stream failed, falling back to mock:', err)
      return new Response(getMockContent(calendarIdea, extraDetail, profile))
    }
  }

  return new Response('Invalid mode', { status: 400 })
}

function getMockContent(calendarIdea: string, extraDetail?: string, profile?: any): string {
  const businessName = profile?.name || 'our brand'
  const sells = profile?.what_sells || 'our premium items'
  const industry = profile?.industry || 'retail'
  const extra = extraDetail ? `\n\nNote: ${extraDetail}` : ''

  return `**INSTAGRAM CAPTION**
✨ Happy new week, family! If you want to elevate your style and stand out, ${businessName} has exactly what you need. 

Our premium, hand-picked ${sells} are crafted just for you. Whether you're dressing up for a major Owambe this weekend or keeping it sleek and professional for business meetings, we've got you covered. No stories, just pure quality! 💯

👉 ${calendarIdea}${extra}

DM us right now to place your order or ask questions. We reply in seconds! Let's get you looking fly today. 🛍️✈️

**WHATSAPP VERSION**
Compliments of the season! 🌟 

Just wanted to personally share this week's special spotlight with you. We know you love quality, and we just brought in new stock of our premium ${sells}! 

Whether you need something custom or ready-to-wear, we are active and taking orders. 

👉 "${calendarIdea}"

Drop us a message right here to book yours before we post on Instagram. Fast delivery nationwide! 🚚💨

**HASHTAGS**
#LagosSMEs #AbujaBusiness #LagosStyle #NigerianFashion #NaijaSME #ShopLocalNigeria #BuyNigerian #PremiumQuality #OwambeVibes #NaijaBrand #ExplorePage #PostlyAI`
}

function getMockPlan(desc: string): string {
  const lowercaseDesc = desc.toLowerCase()
  
  if (lowercaseDesc.includes('wig') || lowercaseDesc.includes('hair') || lowercaseDesc.includes('braid') || lowercaseDesc.includes('beauty')) {
    return `DAY: Monday
PLATFORM: Instagram
TYPE: Product showcase
IDEA: Show the bounce and shine! Post a high-definition Reel showing our best-selling luxury wigs under natural sunlight to capture the texture and lace blend.
---
DAY: Tuesday
PLATFORM: WhatsApp
TYPE: Promo
IDEA: Send a personalized broadcast offering an exclusive 10% discount on our wig styling and laundry packages to returning clients this week.
---
DAY: Wednesday
PLATFORM: Instagram
TYPE: Behind the scenes
IDEA: Take them behind the mirror. Capture a quick step-by-step styling video of custom knot-bleaching and hair plucking to show the work behind every lace.
---
DAY: Thursday
PLATFORM: WhatsApp
TYPE: Engagement
IDEA: Share a poll asking your WhatsApp status audience to vote for their preferred hair length: "Bob or 30 inches?" to trigger direct message interaction.
---
DAY: Friday
PLATFORM: Instagram
TYPE: Campaign
IDEA: OWAMBE READY! Share a carousel of stunning transformations and reviews from clients wearing our wigs to owambes last weekend as strong social proof.`
  }

  if (lowercaseDesc.includes('food') || lowercaseDesc.includes('catering') || lowercaseDesc.includes('cake') || lowercaseDesc.includes('restaurant') || lowercaseDesc.includes('kitchen')) {
    return `DAY: Monday
PLATFORM: Instagram
TYPE: Product showcase
IDEA: Post a mouth-watering close-up video of our signature dish (e.g., smoky jollof rice or gourmet cake slice) to trigger cravings right at lunch hour.
---
DAY: Tuesday
PLATFORM: WhatsApp
TYPE: Promo
IDEA: Send a WhatsApp broadcast showcasing our "Mid-Week Lunch Pack Combo" deal. Offer free delivery to the first 10 offices or families that order.
---
DAY: Wednesday
PLATFORM: Instagram
TYPE: Behind the scenes
IDEA: Capture a quick behind-the-scenes video in the kitchen focusing on the fresh, high-quality ingredients and hygienic prep methods to build consumer trust.
---
DAY: Thursday
PLATFORM: WhatsApp
TYPE: Engagement
IDEA: Post a graphic on WhatsApp Status asking: "Jollof or Fried Rice? Pick your team in the replies!" to trigger DMs and conversation.
---
DAY: Friday
PLATFORM: Instagram
TYPE: Campaign
IDEA: Owambe & Weekend Vibes! Showcase your custom party catering setups or birthday cake designs ready for delivery, along with text reviews from previous celebrations.`
  }

  return `DAY: Monday
PLATFORM: Instagram
TYPE: Product showcase
IDEA: Showcase our new arrivals! Share a beautiful carousel post detailing the key features, unique textures, and details of our premium product collection.
---
DAY: Tuesday
PLATFORM: WhatsApp
TYPE: Promo
IDEA: Broadcast a mid-week flash sale. Give your loyal WhatsApp customers a 24-hour priority access code to get 15% off before we launch to the public.
---
DAY: Wednesday
PLATFORM: Instagram
TYPE: Behind the scenes
IDEA: Share a speed-wrap packaging Reel. Show the care, beautiful packaging cards, and small gifts we add to every single order we ship out today.
---
DAY: Thursday
PLATFORM: WhatsApp
TYPE: Engagement
IDEA: Share a testimonial screenshot on your WhatsApp Status and ask your audience: "What product should we stock next? Tell us in the DMs!"
---
DAY: Friday
PLATFORM: Instagram
TYPE: Campaign
IDEA: Highlight our premium delivery speeds! Share customer unboxing clips and positive reviews demonstrating our reliable, top-tier service.`
}
