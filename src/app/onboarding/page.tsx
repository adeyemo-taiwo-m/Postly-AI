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

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        throw new Error('Failed to save profile')
      }

      // Redirect to dashboard — the dashboard will generate the first plan
      router.push('/dashboard?new=true')
      router.refresh()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#18181E] border border-[#2E2E38] p-8 md:p-12 rounded-xl">
        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
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
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">Business name</label>
                <input
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Adunola Fabrics Lagos"
                  className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">Industry</label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      onClick={() => update('industry', ind)}
                      className={`p-2.5 rounded text-sm text-left border transition font-medium ${
                        form.industry === ind
                          ? 'bg-[#E8622A]/10 border-[#E8622A] text-[#E8622A]'
                          : 'bg-[#0D0D10] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
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
              className="mt-8 w-full bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-40"
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
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">What you sell</label>
                <textarea
                  value={form.what_sells}
                  onChange={e => update('what_sells', e.target.value)}
                  placeholder="e.g. Swiss lace, dry lace, and ankara fabrics. We also do custom aso-ebi coordination for events."
                  rows={3}
                  className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] resize-none transition"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">Your target customer</label>
                <input
                  value={form.target}
                  onChange={e => update('target', e.target.value)}
                  placeholder="e.g. Women aged 25–45 in Lagos who love fashion and attend owambe events"
                  className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
                />
              </div>

              <div>
                <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">Brand tone</label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => update('tone', t)}
                      className={`px-4 py-2 rounded text-sm border transition font-medium ${
                        form.tone === t
                          ? 'bg-[#E8622A]/10 border-[#E8622A] text-[#E8622A]'
                          : 'bg-[#0D0D10] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)} className="px-6 text-[#7A7888] hover:text-white border border-[#2E2E38] rounded p-3 transition font-semibold">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.what_sells || !form.target}
                className="flex-1 bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-40"
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
                  className={`w-full p-4 rounded text-left border transition font-semibold ${
                    form.goal === g.value
                      ? 'bg-[#E8622A]/10 border-[#E8622A] text-white'
                      : 'bg-[#0D0D10] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="px-6 text-[#7A7888] hover:text-white border border-[#2E2E38] rounded p-3 transition font-semibold">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : 'Generate my first plan →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
