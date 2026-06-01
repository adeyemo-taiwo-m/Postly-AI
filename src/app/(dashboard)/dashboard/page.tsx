'use client'
import { useEffect, useState, Suspense } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { PlanItem, Plan } from '@/types'
import { parsePlanFromText } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === 'true'

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const { complete, isLoading: aiLoading } = useCompletion({
    api: '/api/generate',
    body: { mode: 'plan' },
  })

  // Load existing plan or generate new one
  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plan')
      const data = await res.json()

      if (data.plan) {
        setPlan(data.plan)
        setLoading(false)
      } else {
        // No plan for this week — generate one
        generatePlan()
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const result = await complete('')

      if (result) {
        const items = parsePlanFromText(result)

        const saveRes = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        const data = await saveRes.json()
        if (data.plan) {
          setPlan(data.plan)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }

  const markComplete = async (itemId: string) => {
    if (!plan) return

    // Optimistic update
    const updatedItems = plan.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setPlan({ ...plan, items: updatedItems })

    try {
      await fetch(`/api/plan/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          completed: updatedItems.find(i => i.id === itemId)?.completed,
        }),
      })
    } catch (err) {
      console.error(err)
    }
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
  const totalCount = plan?.items.length ?? 0

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1 font-semibold">This week's plan</p>
          <h1 className="text-3xl font-bold text-white mb-1">Your Marketing Plan</h1>
          <p className="text-[#7A7888] text-sm">
            {completedCount} of {totalCount} done this week
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#2E2E38] rounded-full mb-8 overflow-hidden">
          <div
            className="h-1 bg-[#E8622A] rounded-full transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        {/* Plan items */}
        <div className="space-y-3">
          {plan?.items.map((item) => {
            const isToday = item.day.toLowerCase() === today.toLowerCase()

            return (
              <div
                key={item.id}
                className={`border rounded-lg overflow-hidden transition-all duration-150 ${
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
                    {isToday && <p className="text-[#E8622A] text-[10px] font-semibold">Today</p>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${PLATFORM_COLORS[item.platform] ?? 'text-white'}`}>
                        {item.platform}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${TYPE_BADGES[item.type] ?? 'bg-[#2E2E38]/20 text-[#A09EB8]'}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-snug font-medium">{item.idea}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/generate/${item.id}?planId=${plan.id}&idea=${encodeURIComponent(item.idea)}`)}
                      className="bg-[#E8622A] text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-[#D55520] transition whitespace-nowrap"
                    >
                      Write it
                    </button>
                    <button
                      onClick={() => markComplete(item.id)}
                      className={`w-7 h-7 rounded border transition flex items-center justify-center font-bold ${
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
          className="mt-6 w-full border border-[#2E2E38] text-[#7A7888] hover:text-white hover:border-[#3D3D4A] p-3 rounded text-sm transition font-semibold"
        >
          Regenerate this week's plan
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
