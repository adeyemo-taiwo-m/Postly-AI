import { PlanItem } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function parsePlanFromText(text: string): PlanItem[] {
  // Split on --- block delimiters
  const blocks = text.split('---').map(b => b.trim()).filter(Boolean)
  const items: PlanItem[] = []

  for (const block of blocks) {
    const dayMatch = block.match(/DAY:\s*(.+)/i)
    const platformMatch = block.match(/PLATFORM:\s*(.+)/i)
    const typeMatch = block.match(/TYPE:\s*(.+)/i)
    // Extract everything following "IDEA:" up to either the next token header or the end of block
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
