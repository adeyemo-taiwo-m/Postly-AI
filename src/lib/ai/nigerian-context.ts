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
