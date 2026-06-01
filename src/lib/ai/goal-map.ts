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
