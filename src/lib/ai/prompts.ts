import { Profile } from '@/types'
import { GOAL_CAMPAIGN_STRATEGY } from './goal-map'
import { getNigerianContext } from './nigerian-context'

export function buildSystemPrompt(profile: Profile): string {
  const goalStrategy = GOAL_CAMPAIGN_STRATEGY[profile.goal]
  const seasonContext = getNigerianContext()

  return `You are a senior Nigerian marketing consultant specialising in social media for small and medium businesses.

BUSINESS PROFILE:
- Business name: ${profile.name}
- Industry: ${profile.industry}
- What they sell: ${profile.what_sells}
- Target customer: ${profile.target}
- Brand tone: ${profile.tone}

CURRENT STRATEGY:
- Monthly goal: ${profile.goal}
- Goal strategy: ${goalStrategy}

CURRENT NIGERIAN CONTEXT:
${seasonContext}

RULES:
- Write like a local who understands Nigerian buying behaviour, culture, and everyday language.
- Be specific to this exact business — never give generic marketing advice.
- All content should feel authentic and human, not corporate or AI-generated.
- Use Nigerian expressions naturally where they fit the brand tone.
- Every post must have a clear, actionable next step for the reader.`
}

export function buildPlanPrompt(profile: Profile): string {
  const goalStrategy = GOAL_CAMPAIGN_STRATEGY[profile.goal]
  const seasonContext = getNigerianContext()

  return `Generate a 7-day marketing plan (Monday to Sunday) for this Nigerian ${profile.industry} business.

Their goal this month: ${goalStrategy}
Current Nigerian season/context: ${seasonContext}

IMPORTANT RULES:
- Each idea must be SPECIFIC to "${profile.name}" and what they sell — not a generic theme
- Each idea must directly support their monthly goal
- Vary the post types across the week: product showcase, customer story, offer/promo, education post, behind-the-scenes, engagement question
- Include at least one WhatsApp broadcast day and one sales/offer day
- Ideas must be concrete enough that anyone could execute them without asking questions
- Do not repeat the same type two days in a row

Format each day EXACTLY like this (no variation):
DAY: Monday
PLATFORM: Instagram
TYPE: Product showcase
IDEA: [Specific, actionable idea — 1–2 sentences. Make it vivid and concrete.]
---
DAY: Tuesday
...and so on for all 7 days`
}

export function buildContentPrompt(
  calendarIdea: string,
  extraDetail?: string
): string {
  return `The business needs to post today about: "${calendarIdea}"
${extraDetail ? `Extra details to include: ${extraDetail}` : ''}

Write all three outputs in one response. Be specific to this business.

**INSTAGRAM CAPTION**
[Compelling caption. Use relevant emojis naturally. Keep the brand tone. Strong CTA at the end. Feels Nigerian and authentic — not corporate. 100–150 words.]

**WHATSAPP VERSION**
[Same message rewritten for WhatsApp broadcast. More personal and conversational — like a message from a trusted friend who runs a business. Personal opener, body with value, clear CTA. No spam energy. 80–120 words.]

**HASHTAGS**
[12 hashtags total. Mix: 3 Nigerian location tags (e.g. #LagosStyle #AbujaBusiness) + 4 industry-specific + 3 broad reach + 2 campaign-specific. List them on one line separated by spaces.]`
}

export function buildSamplePlanPrompt(businessDescription: string): string {
  return `Generate a sample 5-day marketing plan (Monday to Friday) for a Nigerian business that sells: "${businessDescription}"

This is a demo — make it specific enough to impress them and show real value.

Format each day EXACTLY like this:
DAY: Monday
PLATFORM: Instagram
TYPE: Product showcase
IDEA: [Specific, actionable idea — 1–2 sentences]
---
DAY: Tuesday
...and so on for 5 days`
}
