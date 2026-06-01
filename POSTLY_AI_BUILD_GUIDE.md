# Postly AI — Full Implementation Guide
### From zero to deployed, step by step. Built for an AI coding agent.

---

## Before You Start — The Stack

| Layer | Tech | Why |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server actions, streaming, file-based routing |
| Styling | Tailwind CSS | Utility classes, no component lib for MVP |
| AI | Vercel AI SDK + `gpt-4o-mini` | Built-in streaming, cheap per token |
| Database | Supabase (PostgreSQL) | Auth + DB in one, free tier covers first year |
| Payments | Paystack | Best Nigerian recurring billing |
| Hosting | Vercel | Free tier, zero-config GitHub deploys |

---

## Phase 0 — Project Setup

### 0.1 Scaffold the project

```bash
npx create-next-app@latest postly-ai \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd postly-ai
```

### 0.2 Install all dependencies upfront

```bash
npm install \
  ai \
  @ai-sdk/openai \
  @supabase/supabase-js \
  @supabase/ssr \
  axios \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge
```

### 0.3 Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note for agent**: Never commit `.env.local`. It's gitignored by default in Next.js.

### 0.4 Project folder structure (build to this)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx           ← Weekly plan home screen
│   │   ├── generate/
│   │   │   └── [planItemId]/
│   │   │       └── page.tsx       ← Content generation screen
│   │   ├── history/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts           ← All AI calls go here
│   │   ├── profile/
│   │   │   └── route.ts
│   │   ├── plan/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── history/
│   │   │   └── route.ts
│   │   ├── subscription/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── paystack/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx                   ← Landing page / sample plan demo
├── components/
│   ├── ui/                        ← Reusable primitives (Button, Card, etc.)
│   ├── plan/                      ← Plan-specific components
│   ├── generate/                  ← Generation-specific components
│   └── layout/                    ← Nav, Sidebar, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts              ← Browser client
│   │   ├── server.ts              ← Server client
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── nigerian-context.ts    ← Hardcoded Nigerian calendar data
│   │   ├── prompts.ts             ← All AI prompt builders
│   │   └── goal-map.ts            ← Goal → campaign strategy map
│   ├── paystack.ts
│   └── utils.ts
├── types/
│   └── index.ts                   ← All shared TypeScript types
└── middleware.ts                  ← Auth route protection
```

---

## Phase 1 — Supabase Setup

Do this in the Supabase dashboard SQL editor. Run each block separately.

### 1.1 Profiles table

```sql
create table profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade unique,
  name       text not null,
  industry   text not null,
  what_sells text not null,
  target     text not null,
  tone       text not null default 'Professional',
  goal       text not null default 'increase_sales',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- goal options:
-- more_enquiries | increase_sales | grow_followers | launch_product | retain_customers

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = user_id);
```

### 1.2 Plans table

```sql
create table plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  week_start date not null,
  items      jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- items array shape:
-- [{
--   id: string,
--   day: string,           -- "Monday", "Tuesday", etc.
--   platform: string,      -- "Instagram", "WhatsApp", "Both"
--   type: string,          -- "Promo", "Story", "Engagement", "Campaign"
--   idea: string,          -- The specific actionable idea
--   completed: boolean,
--   generation_id: string | null
-- }]

alter table plans enable row level security;

create policy "Users can view own plans"
  on plans for select using (auth.uid() = user_id);

create policy "Users can insert own plans"
  on plans for insert with check (auth.uid() = user_id);

create policy "Users can update own plans"
  on plans for update using (auth.uid() = user_id);
```

### 1.3 Generations table

```sql
create table generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  plan_item_id text,
  idea_prompt  text not null,
  extra_detail text,
  output       text not null,
  created_at   timestamptz default now()
);

alter table generations enable row level security;

create policy "Users can view own generations"
  on generations for select using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on generations for insert with check (auth.uid() = user_id);
```

### 1.4 Subscriptions table

```sql
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade unique,
  plan            text not null default 'free',
  paystack_sub_id text,
  paystack_email_token text,
  status          text not null default 'active',
  gen_count       int default 0,
  period_start    timestamptz default now(),
  period_end      timestamptz,
  created_at      timestamptz default now()
);

-- plan options: free | beta | starter | growth

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);
```

### 1.5 Auto-create subscription row on signup

Run this in the SQL editor to create a Postgres function + trigger:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan, status, gen_count)
  values (new.id, 'free', 'active', 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Phase 2 — Supabase Client Setup

### 2.1 Browser client — `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2.2 Server client — `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### 2.3 Middleware — `src/middleware.ts`

This protects all `/dashboard`, `/generate`, `/history`, `/settings` routes.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/generate', '/history', '/settings']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

---

## Phase 3 — TypeScript Types

Create `src/types/index.ts`:

```typescript
export type GoalType =
  | 'more_enquiries'
  | 'increase_sales'
  | 'grow_followers'
  | 'launch_product'
  | 'retain_customers'

export type ToneType = 'Professional' | 'Casual' | 'Playful' | 'Bold'

export type PlanType = 'free' | 'beta' | 'starter' | 'growth'

export interface Profile {
  id: string
  user_id: string
  name: string
  industry: string
  what_sells: string
  target: string
  tone: ToneType
  goal: GoalType
  created_at: string
  updated_at: string
}

export interface PlanItem {
  id: string
  day: string
  platform: 'Instagram' | 'WhatsApp' | 'Both'
  type: 'Promo' | 'Story' | 'Engagement' | 'Campaign' | 'Behind the scenes' | 'Education'
  idea: string
  completed: boolean
  generation_id: string | null
}

export interface Plan {
  id: string
  user_id: string
  week_start: string
  items: PlanItem[]
  created_at: string
}

export interface Generation {
  id: string
  user_id: string
  plan_item_id: string | null
  idea_prompt: string
  extra_detail: string | null
  output: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: PlanType
  paystack_sub_id: string | null
  status: 'active' | 'cancelled' | 'expired'
  gen_count: number
  period_start: string
  period_end: string | null
}

// Generation limits per plan
export const PLAN_LIMITS: Record<PlanType, number> = {
  free: 7,
  beta: 30,
  starter: 30,
  growth: 80,
}

// Plan prices in kobo (Paystack uses kobo)
export const PLAN_PRICES_KOBO: Record<string, number> = {
  beta: 250000,     // ₦2,500
  starter: 500000,  // ₦5,000
  growth: 1200000,  // ₦12,000
}
```

---

## Phase 4 — AI Layer

### 4.1 Nigerian context — `src/lib/ai/nigerian-context.ts`

```typescript
export const NIGERIAN_MONTHLY_CONTEXT: Record<string, string> = {
  jan: 'New Year energy, Detty December hangover, fresh start campaigns, dry season deals',
  feb: "Valentine's Day — huge for fashion, food, beauty, gift sellers. Run couples campaigns.",
  mar: 'End of Q1 push, spring energy, pre-Easter buildup',
  apr: 'Easter — family spending, fashion, food, clothing. Holiday travel.',
  may: 'Ramadan (varies by year) — modest fashion, food businesses, iftar specials',
  jun: 'Schools close, family time, mid-year sales push',
  jul: 'Sallah / Eid celebrations — the biggest month for fashion and food businesses',
  aug: 'Back-to-school — clothing, bags, shoes, services. Parents are spending.',
  sep: 'Back-to-school winding down, Q4 buildup, pre-holiday planning',
  oct: 'Pre-Black Friday buzz, year-end planning, corporate gifting starts',
  nov: 'Black Friday — biggest discount month. Run urgency campaigns. Pre-Christmas rush.',
  dec: 'Christmas + Detty December + owambe season — the single biggest month for most Nigerian SMEs',
}

export function getNigerianContext(): string {
  const now = new Date()
  const month = now.toLocaleString('en', { month: 'short' }).toLowerCase()
  const day = now.getDate()

  const baseContext = NIGERIAN_MONTHLY_CONTEXT[month] || ''

  // Payday week detection (25th to 5th of next month)
  const isPaydayWeek = day >= 25 || day <= 5
  const paydayNote = isPaydayWeek
    ? ' IMPORTANT: It is payday week (25th–5th). Nigerians are spending. Push promos and offers now.'
    : ''

  return baseContext + paydayNote
}
```

### 4.2 Goal campaign map — `src/lib/ai/goal-map.ts`

```typescript
import { GoalType } from '@/types'

export const GOAL_CAMPAIGN_STRATEGY: Record<GoalType, string> = {
  more_enquiries:
    'Create curiosity and desire. Build intrigue around your products. End every post with a strong CTA: "DM to order", "Send us a WhatsApp", "Click link in bio". Make it easy to take the next step.',
  increase_sales:
    'Push urgency, scarcity, and value. Use limited-time offers, bundle deals, and price anchoring. "Only 5 left", "Sale ends Sunday", "Buy 2 get 1 free".',
  grow_followers:
    'Make shareable, engaging, relatable content. Polls, questions, giveaways, and behind-the-scenes. Ask followers to tag friends. Create content people want to repost.',
  launch_product:
    'Week 1: Tease — hint at something coming, build curiosity. Week 2: Reveal — show the product, explain what it does. Week 3: Launch with urgency — "Available now, first 20 orders get X". Week 4: Social proof — share customer reactions and reviews.',
  retain_customers:
    'Show appreciation for existing customers. Loyalty offers, "customer of the week" features, personal stories, and behind-the-scenes content that makes customers feel part of the brand.',
}

export function getGoalLabel(goal: GoalType): string {
  const labels: Record<GoalType, string> = {
    more_enquiries: 'Get More Enquiries',
    increase_sales: 'Increase Sales',
    grow_followers: 'Grow Followers',
    launch_product: 'Launch a Product',
    retain_customers: 'Retain Customers',
  }
  return labels[goal]
}
```

### 4.3 Prompt builders — `src/lib/ai/prompts.ts`

```typescript
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
```

---

## Phase 5 — API Routes

### 5.1 Generate route — `src/app/api/generate/route.ts`

This is the most important file. It handles both plan generation and content generation.

```typescript
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
      maxTokens: 600,
    })

    return result.toDataStreamResponse()
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
      maxTokens: 900,
    })
    return result.toDataStreamResponse()
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
      maxTokens: 700,
    })
    return result.toDataStreamResponse()
  }

  return new Response('Invalid mode', { status: 400 })
}
```

### 5.2 Profile route — `src/app/api/profile/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, industry, what_sells, target, tone, goal } = body

  // Validate required fields
  if (!name || !industry || !what_sells || !target) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      name,
      industry,
      what_sells,
      target,
      tone: tone || 'Professional',
      goal: goal || 'increase_sales',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile: data })
}
```

### 5.3 Plan routes — `src/app/api/plan/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfWeek } from 'date-fns'

function getMondayOfCurrentWeek(): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = getMondayOfCurrentWeek()

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: data, weekStart })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await req.json()
  const weekStart = getMondayOfCurrentWeek()

  const { data, error } = await supabase
    .from('plans')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      items,
    }, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plan: data })
}
```

### 5.4 Plan item update — `src/app/api/plan/[id]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId, completed, generation_id } = await req.json()

  // Get the plan
  const { data: plan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', params.id)
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
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plan: data })
}
```

### 5.5 History route — `src/app/api/history/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ generations: data })
}
```

### 5.6 Subscription route — `src/app/api/subscription/route.ts`

```typescript
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
```

### 5.7 Paystack webhook — `src/app/api/webhooks/paystack/route.ts`

```typescript
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
```

---

## Phase 6 — Auth Pages

### 6.1 Signup page — `src/app/(auth)/signup/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to onboarding/profile setup
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">
          Create your account
        </h1>
        <p className="text-[#7A7888] mb-8">Start your free week — no card required.</p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
          />
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create free account'}
          </button>
        </div>

        <p className="text-[#7A7888] text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E8622A] hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

### 6.2 Login page — `src/app/(auth)/login/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-[#7A7888] mb-8">Log in to see your marketing plan.</p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>

        <p className="text-[#7A7888] text-sm mt-6 text-center">
          No account?{' '}
          <Link href="/signup" className="text-[#E8622A] hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Phase 7 — Onboarding & Profile Setup

### 7.1 Onboarding page — `src/app/onboarding/page.tsx`

This runs right after signup. Collect profile + goal, then generate the first plan.

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  'Fashion & Clothing', 'Food & Catering', 'Hair & Beauty', 'Electronics',
  'Real Estate', 'Logistics', 'Education & Coaching', 'Health & Wellness',
  'Events & Entertainment', 'Other',
]

const TONES = ['Professional', 'Casual', 'Playful', 'Bold']

const GOALS = [
  { value: 'increase_sales', label: 'Increase sales' },
  { value: 'more_enquiries', label: 'Get more enquiries / DMs' },
  { value: 'grow_followers', label: 'Grow my followers' },
  { value: 'launch_product', label: 'Launch a new product' },
  { value: 'retain_customers', label: 'Keep existing customers engaged' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    industry: '',
    what_sells: '',
    target: '',
    tone: 'Professional',
    goal: 'increase_sales',
  })

  const update = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    setLoading(true)

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      setLoading(false)
      return
    }

    // Redirect to dashboard — the dashboard will generate the first plan
    router.push('/dashboard?new=true')
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-[#E8622A]' : 'bg-[#2E2E38]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Tell us about your business</h2>
            <p className="text-[#7A7888] mb-6 text-sm">This is how we make your plan specific to you.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">Business name</label>
                <input
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Adunola Fabrics Lagos"
                  className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">Industry</label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      onClick={() => update('industry', ind)}
                      className={`p-2 rounded text-sm text-left border transition ${
                        form.industry === ind
                          ? 'bg-[#E8622A]/10 border-[#E8622A] text-[#E8622A]'
                          : 'bg-[#18181E] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.name || !form.industry}
              className="mt-6 w-full bg-[#E8622A] text-white font-semibold p-3 rounded transition disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">What do you sell?</h2>
            <p className="text-[#7A7888] mb-6 text-sm">Be specific — this is what makes your plan different from everyone else's.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">What you sell</label>
                <textarea
                  value={form.what_sells}
                  onChange={e => update('what_sells', e.target.value)}
                  placeholder="e.g. Swiss lace, dry lace, and ankara fabrics. We also do custom aso-ebi coordination for events."
                  rows={3}
                  className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] resize-none"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">Your target customer</label>
                <input
                  value={form.target}
                  onChange={e => update('target', e.target.value)}
                  placeholder="e.g. Women aged 25–45 in Lagos who love fashion and attend owambe events"
                  className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">Brand tone</label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => update('tone', t)}
                      className={`px-4 py-2 rounded text-sm border transition ${
                        form.tone === t
                          ? 'bg-[#E8622A]/10 border-[#E8622A] text-[#E8622A]'
                          : 'bg-[#18181E] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-6 text-[#7A7888] hover:text-white border border-[#2E2E38] rounded p-3 transition">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.what_sells || !form.target}
                className="flex-1 bg-[#E8622A] text-white font-semibold p-3 rounded transition disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">What's your goal this month?</h2>
            <p className="text-[#7A7888] mb-6 text-sm">Your weekly plan will be built around this. Update it monthly.</p>

            <div className="space-y-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => update('goal', g.value)}
                  className={`w-full p-4 rounded text-left border transition ${
                    form.goal === g.value
                      ? 'bg-[#E8622A]/10 border-[#E8622A] text-white'
                      : 'bg-[#18181E] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="px-6 text-[#7A7888] border border-[#2E2E38] rounded p-3 transition">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#E8622A] text-white font-semibold p-3 rounded transition disabled:opacity-40"
              >
                {loading ? 'Saving...' : 'Generate my first plan →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 8 — Dashboard (Weekly Plan)

### 8.1 Plan parsing utility — `src/lib/utils.ts`

The AI returns the plan as formatted text. Parse it into structured `PlanItem[]`.

```typescript
import { PlanItem } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// npm install uuid @types/uuid

export function parsePlanFromText(text: string): PlanItem[] {
  const blocks = text.split('---').map(b => b.trim()).filter(Boolean)
  const items: PlanItem[] = []

  for (const block of blocks) {
    const dayMatch = block.match(/DAY:\s*(.+)/i)
    const platformMatch = block.match(/PLATFORM:\s*(.+)/i)
    const typeMatch = block.match(/TYPE:\s*(.+)/i)
    const ideaMatch = block.match(/IDEA:\s*([\s\S]+?)(?=\n[A-Z]+:|$)/i)

    if (dayMatch && platformMatch && typeMatch && ideaMatch) {
      items.push({
        id: uuidv4(),
        day: dayMatch[1].trim(),
        platform: platformMatch[1].trim() as PlanItem['platform'],
        type: typeMatch[1].trim() as PlanItem['type'],
        idea: ideaMatch[1].trim(),
        completed: false,
        generation_id: null,
      })
    }
  }

  return items
}

export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}
```

### 8.2 Dashboard page — `src/app/(dashboard)/dashboard/page.tsx`

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useCompletion } from 'ai/react'
import { PlanItem, Plan } from '@/types'
import { parsePlanFromText } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === 'true'

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const { complete, completion, isLoading: aiLoading } = useCompletion({
    api: '/api/generate',
    body: { mode: 'plan' },
  })

  // Load existing plan or generate new one
  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    setLoading(true)
    const res = await fetch('/api/plan')
    const { plan } = await res.json()

    if (plan) {
      setPlan(plan)
      setLoading(false)
    } else {
      // No plan for this week — generate one
      generatePlan()
    }
  }

  const generatePlan = async () => {
    setGenerating(true)
    const result = await complete('')

    if (result) {
      const items = parsePlanFromText(result)

      const saveRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const { plan } = await saveRes.json()
      setPlan(plan)
    }
    setGenerating(false)
    setLoading(false)
  }

  const markComplete = async (itemId: string) => {
    if (!plan) return

    // Optimistic update
    const updatedItems = plan.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setPlan({ ...plan, items: updatedItems })

    await fetch(`/api/plan/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId,
        completed: updatedItems.find(i => i.id === itemId)?.completed,
      }),
    })
  }

  const PLATFORM_COLORS: Record<string, string> = {
    Instagram: 'text-pink-400',
    WhatsApp: 'text-green-400',
    Both: 'text-[#E8622A]',
  }

  const TYPE_BADGES: Record<string, string> = {
    Promo: 'bg-[#E8622A]/10 text-[#E8622A] border border-[#E8622A]/20',
    Story: 'bg-blue-900/20 text-blue-400 border border-blue-500/20',
    Engagement: 'bg-purple-900/20 text-purple-400 border border-purple-500/20',
    Campaign: 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/20',
    'Behind the scenes': 'bg-[#2D9E72]/10 text-[#2D9E72] border border-[#2D9E72]/20',
    Education: 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/20',
  }

  if (loading || generating || aiLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#7A7888] text-sm">
            {generating ? 'Building your marketing plan...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const completedCount = plan?.items.filter(i => i.completed).length ?? 0

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1">This week's plan</p>
          <h1 className="text-3xl font-bold text-white mb-1">Your Marketing Plan</h1>
          <p className="text-[#7A7888] text-sm">
            {completedCount} of {plan?.items.length ?? 0} done this week
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#2E2E38] rounded-full mb-8">
          <div
            className="h-1 bg-[#E8622A] rounded-full transition-all"
            style={{ width: `${((completedCount / (plan?.items.length ?? 1)) * 100)}%` }}
          />
        </div>

        {/* Plan items */}
        <div className="space-y-3">
          {plan?.items.map((item) => {
            const isToday = item.day.toLowerCase() === today.toLowerCase()

            return (
              <div
                key={item.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  item.completed
                    ? 'opacity-50 border-[#2E2E38]'
                    : isToday
                    ? 'border-[#E8622A]/40 shadow-[0_0_0_1px_rgba(232,98,42,0.1)]'
                    : 'border-[#2E2E38]'
                }`}
              >
                <div className={`flex items-center gap-3 p-4 ${isToday ? 'bg-[rgba(232,98,42,0.05)]' : 'bg-[#18181E]'}`}>
                  {/* Day */}
                  <div className="w-12 text-center flex-shrink-0">
                    <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-[#E8622A]' : 'text-[#7A7888]'}`}>
                      {item.day.slice(0, 3)}
                    </p>
                    {isToday && <p className="text-[#E8622A] text-[10px]">Today</p>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium ${PLATFORM_COLORS[item.platform] ?? 'text-white'}`}>
                        {item.platform}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${TYPE_BADGES[item.type] ?? 'text-[#7A7888]'}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-snug">{item.idea}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/generate/${item.id}?planId=${plan.id}`)}
                      className="bg-[#E8622A] text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-[#D55520] transition whitespace-nowrap"
                    >
                      Write it
                    </button>
                    <button
                      onClick={() => markComplete(item.id)}
                      className={`w-7 h-7 rounded border transition flex items-center justify-center ${
                        item.completed
                          ? 'bg-[#2D9E72] border-[#2D9E72] text-white'
                          : 'border-[#3D3D4A] text-[#7A7888] hover:border-[#2D9E72] hover:text-[#2D9E72]'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Regenerate button */}
        <button
          onClick={generatePlan}
          className="mt-6 w-full border border-[#2E2E38] text-[#7A7888] hover:text-white hover:border-[#3D3D4A] p-3 rounded text-sm transition"
        >
          Regenerate this week's plan
        </button>
      </div>
    </div>
  )
}
```

---

## Phase 9 — Content Generation Screen

### `src/app/(dashboard)/generate/[planItemId]/page.tsx`

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useCompletion } from 'ai/react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

export default function GeneratePage() {
  const { planItemId } = useParams()
  const searchParams = useSearchParams()
  const planId = searchParams.get('planId')
  const router = useRouter()

  const [idea, setIdea] = useState('')
  const [extraDetail, setExtraDetail] = useState('')
  const [output, setOutput] = useState('')
  const [saved, setSaved] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  const { complete, completion, isLoading } = useCompletion({
    api: '/api/generate',
    onFinish: async (prompt, result) => {
      // Save to generations table
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_item_id: planItemId,
          idea_prompt: idea,
          extra_detail: extraDetail || null,
          output: result,
        }),
      })
      const { generation } = await res.json()

      // Link generation to plan item
      if (planId && generation) {
        await fetch(`/api/plan/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: planItemId, generation_id: generation.id }),
        })
      }
      setOutput(result)
      setSaved(true)
    },
    onError: (err) => {
      if (err.message.includes('402')) {
        setLimitReached(true)
      }
    },
  })

  const handleGenerate = async () => {
    if (!idea) return
    setSaved(false)
    await complete('', {
      body: {
        mode: 'content',
        calendarIdea: idea,
        extraDetail,
      },
    })
  }

  const displayOutput = completion || output

  // Parse sections from output
  const sections = parseOutputSections(displayOutput)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (limitReached) {
    return (
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <p className="text-4xl mb-4">⚡</p>
          <h2 className="text-2xl font-bold text-white mb-2">You've used all your generations</h2>
          <p className="text-[#7A7888] mb-6">Upgrade to keep creating content this month.</p>
          <button
            onClick={() => router.push('/settings?upgrade=true')}
            className="bg-[#E8622A] text-white px-6 py-3 rounded font-semibold"
          >
            Upgrade now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="text-[#7A7888] hover:text-white text-sm mb-6 flex items-center gap-2 transition"
        >
          ← Back to plan
        </button>

        <h1 className="text-2xl font-bold text-white mb-6">Write your content</h1>

        {/* Input area */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
              What this post is about
            </label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              rows={3}
              placeholder="Paste today's plan idea here, or write your own..."
              className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] resize-none"
            />
          </div>

          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
              Extra details (optional)
            </label>
            <input
              value={extraDetail}
              onChange={e => setExtraDetail(e.target.value)}
              placeholder="Price, offer deadline, location, event name..."
              className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !idea}
            className="w-full bg-[#E8622A] text-white font-semibold p-3 rounded transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Writing...
              </>
            ) : 'Write it ✦'}
          </button>
        </div>

        {/* Output sections */}
        {displayOutput && (
          <div className="space-y-4">
            {sections.instagram && (
              <OutputSection
                title="Instagram Caption"
                content={sections.instagram}
                onCopy={() => copyToClipboard(sections.instagram)}
                accent="pink"
              />
            )}
            {sections.whatsapp && (
              <OutputSection
                title="WhatsApp Version"
                content={sections.whatsapp}
                onCopy={() => copyToClipboard(sections.whatsapp)}
                accent="green"
              />
            )}
            {sections.hashtags && (
              <OutputSection
                title="Hashtags"
                content={sections.hashtags}
                onCopy={() => copyToClipboard(sections.hashtags)}
                accent="orange"
              />
            )}

            {/* Copy all */}
            <button
              onClick={() => copyToClipboard(displayOutput)}
              className="w-full border border-[#2E2E38] text-[#7A7888] hover:text-white p-3 rounded text-sm transition"
            >
              Copy everything
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OutputSection({
  title,
  content,
  onCopy,
  accent,
}: {
  title: string
  content: string
  onCopy: () => void
  accent: 'pink' | 'green' | 'orange'
}) {
  const [copied, setCopied] = useState(false)
  const accentColors = {
    pink: 'text-pink-400 border-pink-500/20',
    green: 'text-[#2D9E72] border-[#2D9E72]/20',
    orange: 'text-[#E8622A] border-[#E8622A]/20',
  }

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-[#18181E] border border-[#2E2E38] rounded-lg overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2E2E38]">
        <span className={`text-xs font-bold uppercase tracking-widest ${accentColors[accent].split(' ')[0]}`}>
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="text-[#7A7888] hover:text-white text-xs transition"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <p className="text-[#E2E0EC] text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function parseOutputSections(text: string) {
  const instagram = text.match(/\*\*INSTAGRAM CAPTION\*\*\s*([\s\S]*?)(?=\*\*WHATSAPP|$)/i)?.[1]?.trim() ?? ''
  const whatsapp = text.match(/\*\*WHATSAPP VERSION\*\*\s*([\s\S]*?)(?=\*\*HASHTAGS|$)/i)?.[1]?.trim() ?? ''
  const hashtags = text.match(/\*\*HASHTAGS\*\*\s*([\s\S]*?)$/i)?.[1]?.trim() ?? ''
  return { instagram, whatsapp, hashtags }
}
```

> **For the agent**: Also create a `POST` handler in `src/app/api/history/route.ts` to save generations. The `GET` handler is in Phase 5.5. Add this `POST` to the same file:

```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_item_id, idea_prompt, extra_detail, output } = await req.json()

  const { data, error } = await supabase
    .from('generations')
    .insert({ user_id: user.id, plan_item_id, idea_prompt, extra_detail, output })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ generation: data })
}
```

---

## Phase 10 — Landing Page with Demo

### `src/app/page.tsx`

This is the value-before-signup flow. User types their business, sees a sample plan, then signs up.

```typescript
'use client'
import { useState } from 'react'
import { useCompletion } from 'ai/react'
import { useRouter } from 'next/navigation'
import { parsePlanFromText } from '@/lib/utils'
import { PlanItem } from '@/types'

export default function LandingPage() {
  const router = useRouter()
  const [businessDesc, setBusinessDesc] = useState('')
  const [samplePlan, setSamplePlan] = useState<PlanItem[]>([])
  const [showCTA, setShowCTA] = useState(false)

  const { complete, isLoading } = useCompletion({
    api: '/api/generate',
    onFinish: (_, result) => {
      const items = parsePlanFromText(result)
      setSamplePlan(items)
      setShowCTA(true)
    },
  })

  const handleDemo = async () => {
    if (!businessDesc.trim()) return
    setSamplePlan([])
    setShowCTA(false)
    await complete('', {
      body: { mode: 'demo', businessDescription: businessDesc },
    })
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] text-white">
      {/* Nav */}
      <nav className="border-b border-[#2E2E38] px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-lg">Postly<span className="text-[#E8622A] italic">AI</span></span>
        <button
          onClick={() => router.push('/login')}
          className="text-[#7A7888] hover:text-white text-sm transition"
        >
          Log in
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-4">AI Marketing for Nigerian Businesses</p>
          <h1 className="text-5xl md:text-6xl font-black mb-4 leading-none tracking-tight">
            Your marketing plan,<br />
            <span className="text-[#E8622A] italic">every Monday.</span>
          </h1>
          <p className="text-[#A09EB8] text-lg mb-2">Tell Postly what you sell. Get a full week's plan — specific to your business, your goal, your season.</p>
          <p className="text-[#7A7888] text-sm">₦2,500/month. Cheaper than one social media post design.</p>
        </div>

        {/* Demo input */}
        <div className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-6 mb-8">
          <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-3 block">
            What does your business sell?
          </label>
          <div className="flex gap-3">
            <input
              value={businessDesc}
              onChange={e => setBusinessDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDemo()}
              placeholder="e.g. Nigerian wigs and braids in Port Harcourt"
              className="flex-1 bg-[#0D0D10] border border-[#2E2E38] rounded-lg p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
            />
            <button
              onClick={handleDemo}
              disabled={isLoading || !businessDesc.trim()}
              className="bg-[#E8622A] hover:bg-[#D55520] text-white px-5 rounded-lg font-semibold transition disabled:opacity-40 whitespace-nowrap"
            >
              {isLoading ? '...' : 'See your week →'}
            </button>
          </div>
        </div>

        {/* Sample plan output */}
        {isLoading && samplePlan.length === 0 && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#7A7888] text-sm">Building your sample plan...</p>
          </div>
        )}

        {samplePlan.length > 0 && (
          <div>
            <p className="text-[#7A7888] text-sm mb-4 text-center">
              Here's a sample plan for your business — this is what you'd get every Monday.
            </p>
            <div className="space-y-2 mb-8">
              {samplePlan.map((item) => (
                <div key={item.id} className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#E8622A] text-xs font-bold">{item.day}</span>
                    <span className="text-[#7A7888] text-xs">·</span>
                    <span className="text-[#7A7888] text-xs">{item.platform}</span>
                    <span className="text-[#7A7888] text-xs">·</span>
                    <span className="text-[#7A7888] text-xs">{item.type}</span>
                  </div>
                  <p className="text-white text-sm">{item.idea}</p>
                </div>
              ))}
            </div>

            {showCTA && (
              <div className="bg-[#E8622A]/10 border border-[#E8622A]/30 rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Get this for your business — every week.
                </h3>
                <p className="text-[#A09EB8] text-sm mb-4">
                  Sign up free. Your first 7 generations are on us.
                </p>
                <button
                  onClick={() => router.push('/signup')}
                  className="bg-[#E8622A] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#D55520] transition"
                >
                  Start free — no card needed
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 11 — Dashboard Layout & Navigation

### `src/app/(dashboard)/layout.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/layout/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-[#0D0D10]">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[rgba(13,13,16,0.95)] backdrop-blur border-b border-[#2E2E38] flex items-center justify-between px-6">
        <Link href="/dashboard" className="font-bold text-white">
          Postly<span className="text-[#E8622A] italic">AI</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[#7A7888] hover:text-white text-sm transition">
            Plan
          </Link>
          <Link href="/history" className="text-[#7A7888] hover:text-white text-sm transition">
            History
          </Link>
          <Link href="/settings" className="text-[#7A7888] hover:text-white text-sm transition">
            Settings
          </Link>
          <LogoutButton />
        </div>
      </nav>

      <div className="pt-14">
        {children}
      </div>
    </div>
  )
}
```

### `src/components/layout/LogoutButton.tsx`

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[#7A7888] hover:text-white text-sm transition"
    >
      Log out
    </button>
  )
}
```

---

## Phase 12 — Settings Page (Profile + Subscription)

### `src/app/(dashboard)/settings/page.tsx`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { Profile, Subscription, PLAN_LIMITS } from '@/types'

const GOALS = [
  { value: 'increase_sales', label: 'Increase sales' },
  { value: 'more_enquiries', label: 'Get more enquiries / DMs' },
  { value: 'grow_followers', label: 'Grow my followers' },
  { value: 'launch_product', label: 'Launch a new product' },
  { value: 'retain_customers', label: 'Keep existing customers engaged' },
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/subscription').then(r => r.json()),
    ]).then(([{ profile }, { subscription, remaining }]) => {
      setProfile(profile)
      setSubscription(subscription)
      setRemaining(remaining)
    })
  }, [])

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePaystack = () => {
    // Open Paystack inline payment
    const handler = (window as any).PaystackPop?.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: 'user@email.com', // get from session
      amount: 250000, // ₦2,500 in kobo
      currency: 'NGN',
      plan: 'PLN_beta_code_here', // your Paystack plan code
      callback: (response: any) => {
        console.log('Payment successful', response)
        window.location.reload()
      },
      onClose: () => console.log('Payment closed'),
    })
    handler.openIframe()
  }

  if (!profile) return <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Subscription status */}
        {subscription && (
          <div className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#A09EB8] text-xs uppercase tracking-widest">Your plan</span>
              <span className="bg-[#E8622A]/10 text-[#E8622A] text-xs px-3 py-1 rounded border border-[#E8622A]/20 font-medium capitalize">
                {subscription.plan}
              </span>
            </div>
            <div className="h-2 bg-[#2E2E38] rounded-full mb-2">
              <div
                className="h-2 bg-[#E8622A] rounded-full"
                style={{
                  width: `${(remaining / (PLAN_LIMITS[subscription.plan] ?? 7)) * 100}%`
                }}
              />
            </div>
            <p className="text-[#7A7888] text-xs">{remaining} generations remaining this month</p>

            {subscription.plan === 'free' && (
              <button
                onClick={handlePaystack}
                className="mt-4 w-full bg-[#E8622A] text-white py-2.5 rounded font-semibold text-sm hover:bg-[#D55520] transition"
              >
                Upgrade — ₦2,500/month (beta price)
              </button>
            )}
          </div>
        )}

        {/* Profile form */}
        <div className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-5 space-y-5">
          <h2 className="text-white font-semibold">Business profile</h2>

          {[
            { key: 'name', label: 'Business name', placeholder: 'Adunola Fabrics' },
            { key: 'industry', label: 'Industry', placeholder: 'Fashion & Clothing' },
            { key: 'what_sells', label: 'What you sell', placeholder: 'Swiss lace, dry lace...' },
            { key: 'target', label: 'Target customer', placeholder: 'Women 25–45 in Lagos...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">{label}</label>
              <input
                value={(profile as any)[key]}
                onChange={e => setProfile({ ...profile, [key]: e.target.value } as Profile)}
                placeholder={placeholder}
                className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
              />
            </div>
          ))}

          {/* Monthly goal */}
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
              Goal this month <span className="text-[#E8622A]">(update monthly)</span>
            </label>
            <div className="space-y-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setProfile({ ...profile, goal: g.value as any })}
                  className={`w-full p-3 rounded text-left text-sm border transition ${
                    profile.goal === g.value
                      ? 'bg-[#E8622A]/10 border-[#E8622A] text-white'
                      : 'bg-[#0D0D10] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/30'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-[#E8622A] text-white py-3 rounded font-semibold transition disabled:opacity-40"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

> **Agent note**: For Paystack inline payments, add this script to `src/app/layout.tsx`:
> ```html
> <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
> ```

---

## Phase 13 — History Page

### `src/app/(dashboard)/history/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: generations } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">History</h1>

        {!generations?.length && (
          <p className="text-[#7A7888]">No generations yet. Start from your weekly plan.</p>
        )}

        <div className="space-y-3">
          {generations?.map((gen) => (
            <div key={gen.id} className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="text-white text-sm font-medium">{gen.idea_prompt}</p>
                <span className="text-[#7A7888] text-xs flex-shrink-0">
                  {format(new Date(gen.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-[#7A7888] text-xs line-clamp-2">{gen.output.slice(0, 120)}...</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Phase 14 — Paystack Setup Checklist

Do this in your Paystack dashboard before launch:

1. Create your Paystack account at paystack.com
2. Go to **Products → Subscriptions → Plans**
3. Create three plans:
   - **Beta Plan**: ₦2,500/month — copy the plan code into your webhook handler
   - **Starter Plan**: ₦5,000/month
   - **Growth Plan**: ₦12,000/month
4. Go to **Settings → API Keys** — copy your secret key to `.env.local`
5. Go to **Settings → Webhooks** — add: `https://yourdomain.com/api/webhooks/paystack`
6. Enable events: `subscription.create`, `subscription.disable`, `subscription.not_renew`, `invoice.update`, `invoice.payment_failed`

---

## Phase 15 — Deployment to Vercel

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: initial Postly AI build"
git push origin main

# 2. Go to vercel.com → New Project → Import from GitHub
# 3. Add all environment variables from .env.local in Vercel's settings
# 4. Deploy
```

After deployment:
- Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to your production URL
- Update Supabase Auth → URL Configuration → Site URL to your production URL
- Update Supabase Auth → Redirect URLs to include `https://yourdomain.com/**`
- Update Paystack webhook URL to production URL

---

## Build Order Summary

Follow this exact sequence. Each phase unlocks the next.

| Week | Phase | Output |
|---|---|---|
| Day 1–2 | 0–2 | Project scaffolded, Supabase tables created, clients configured |
| Day 2–3 | 3–4 | Types defined, AI layer built (prompts, contexts, goal map) |
| Day 3–4 | 5 | All API routes working and testable via Postman/Thunder Client |
| Day 4–5 | 6–7 | Auth pages + onboarding flow complete |
| Day 6–7 | 8 | Dashboard with weekly plan generation working |
| Day 8 | 9 | Content generation screen with streaming output |
| Day 9 | 10–11 | Landing page demo + dashboard layout + navigation |
| Day 10 | 12–13 | Settings page + history page |
| Day 10 | 14–15 | Paystack setup + deploy to Vercel |

---

## Testing Checklist Before Launch

Run through every one of these manually before opening to users:

- [ ] New user signs up → redirected to onboarding → completes profile → plan generates correctly
- [ ] Returning user logs in → sees this week's existing plan (not a new one every visit)
- [ ] Monday auto-regeneration: plan generates fresh on Monday, old one preserved in DB
- [ ] "Write it" button → streaming content appears section by section
- [ ] Copy buttons copy correct sections
- [ ] Mark complete ✓ → item shows as done, persists on refresh
- [ ] Free user hits 7 generations → upgrade prompt appears (not a hard crash)
- [ ] Landing page demo: type a business → sample plan appears → CTA → signup → plan generated
- [ ] Paystack payment flow completes → subscription updates in DB → gen_count resets
- [ ] Paystack webhook verified with correct signature
- [ ] Mobile responsiveness on iPhone and Android (test in Chrome DevTools)
- [ ] All environment variables set correctly in Vercel production

---

## Common Issues & Fixes

**"TypeError: cookies() should be awaited"**
→ You forgot `await cookies()` in the server Supabase client. Check `src/lib/supabase/server.ts`.

**Streaming stops mid-generation**
→ Make sure the route has `export const runtime = 'edge'` at the top.

**Plan regenerates every visit instead of once per week**
→ The `GET /api/plan` check must use `week_start = getMondayOfCurrentWeek()`. Check date-fns import.

**Paystack webhook returns 400 signature error**
→ The signature check uses the raw request body as text. Make sure you're reading `req.text()` before `JSON.parse()`, not `req.json()` directly.

**RLS blocking inserts**
→ Check your Supabase RLS policies. The `with check` clause on insert policies must match `auth.uid() = user_id`.

**`useCompletion` body not being sent**
→ Pass extra fields in the `body` parameter of `complete('', { body: { mode: 'plan' } })`, not in the hook setup, unless they're static.

---

*Postly AI — PRD v4.0 — Built by Taiwo Adeyemo*
*Stop refining. Start building.*
