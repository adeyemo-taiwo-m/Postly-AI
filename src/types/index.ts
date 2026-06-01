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
