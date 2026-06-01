'use client'
import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
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
      <nav className="border-b border-[#2E2E38] px-6 py-4 flex justify-between items-center bg-[rgba(13,13,16,0.95)] backdrop-blur">
        <span className="font-bold text-lg">Postly<span className="text-[#E8622A] italic">AI</span></span>
        <button
          onClick={() => router.push('/login')}
          className="text-[#7A7888] hover:text-white text-sm transition font-semibold"
        >
          Log in
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-4 font-semibold">AI Marketing for Nigerian Businesses</p>
          <h1 className="text-5xl md:text-6xl font-black mb-4 leading-none tracking-tight">
            Your marketing plan,<br />
            <span className="text-[#E8622A] italic">every Monday.</span>
          </h1>
          <p className="text-[#A09EB8] text-lg mb-2">Tell Postly what you sell. Get a full week's plan — specific to your business, your goal, your season.</p>
          <p className="text-[#7A7888] text-sm font-medium">₦2,500/month. Cheaper than one social media post design.</p>
        </div>

        {/* Demo input */}
        <div className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-6 mb-8">
          <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-3 block font-semibold">
            What does your business sell?
          </label>
          <div className="flex gap-3">
            <input
              value={businessDesc}
              onChange={e => setBusinessDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDemo()}
              placeholder="e.g. Nigerian wigs and braids in Port Harcourt"
              className="flex-1 bg-[#0D0D10] border border-[#2E2E38] rounded-lg p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
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
            <p className="text-[#7A7888] text-sm mb-4 text-center font-medium">
              Here's a sample plan for your business — this is what you'd get every Monday.
            </p>
            <div className="space-y-2 mb-8">
              {samplePlan.map((item) => (
                <div key={item.id} className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[#E8622A] text-xs font-bold">{item.day}</span>
                    <span className="text-[#7A7888] text-xs">·</span>
                    <span className="text-pink-400 text-xs font-semibold">{item.platform}</span>
                    <span className="text-[#7A7888] text-xs">·</span>
                    <span className="text-xs font-medium text-[#A09EB8]">{item.type}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{item.idea}</p>
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
                  className="bg-[#E8622A] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#D55520] transition"
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
