'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Profile, Subscription, PLAN_LIMITS } from '@/types'
import { createClient } from '@/lib/supabase/client'

const GOALS = [
  { value: 'increase_sales', label: 'Increase sales' },
  { value: 'more_enquiries', label: 'Get more enquiries / DMs' },
  { value: 'grow_followers', label: 'Grow my followers' },
  { value: 'launch_product', label: 'Launch a new product' },
  { value: 'retain_customers', label: 'Keep existing customers engaged' },
]

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldUpgrade = searchParams.get('upgrade') === 'true'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    // Get user email
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '')
      }
    })

    // Fetch data
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/subscription').then(r => r.json()),
    ]).then(([{ profile }, { subscription, remaining }]) => {
      if (profile) setProfile(profile)
      if (subscription) setSubscription(subscription)
      setRemaining(remaining)
    }).catch(err => {
      console.error(err)
      setError('Failed to load settings.')
    })
  }, [])

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!res.ok) {
        throw new Error('Failed to update profile')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError('Failed to save profile changes.')
    } finally {
      setSaving(false)
    }
  }

  const handlePaystack = () => {
    if (!userEmail) {
      alert('Email not loaded. Please wait.')
      return
    }

    // Open Paystack inline payment
    const handler = (window as any).PaystackPop?.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: 250000, // ₦2,500 in kobo
      currency: 'NGN',
      plan: 'PLN_beta_code_here', // your Paystack plan code
      callback: (response: any) => {
        console.log('Payment successful', response)
        window.location.reload()
      },
      onClose: () => console.log('Payment closed'),
    })
    handler?.openIframe()
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1 font-semibold">User Controls</p>
          <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Subscription status */}
        {subscription && (
          <div className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#A09EB8] text-xs uppercase tracking-widest font-semibold">Your plan</span>
              <span className="bg-[#E8622A]/10 text-[#E8622A] text-xs px-3 py-1 rounded border border-[#E8622A]/20 font-bold capitalize">
                {subscription.plan}
              </span>
            </div>
            <div className="h-2 bg-[#2E2E38] rounded-full mb-3 overflow-hidden">
              <div
                className="h-2 bg-[#E8622A] rounded-full transition-all duration-300"
                style={{
                  width: `${(remaining / (PLAN_LIMITS[subscription.plan] ?? 7)) * 100}%`
                }}
              />
            </div>
            <p className="text-[#7A7888] text-xs font-medium">{remaining} generations remaining this month</p>

            {subscription.plan === 'free' && (
              <button
                onClick={handlePaystack}
                className="mt-6 w-full bg-[#E8622A] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#D55520] transition"
              >
                Upgrade — ₦2,500/month (beta price)
              </button>
            )}
          </div>
        )}

        {/* Profile form */}
        <div className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-6 space-y-5">
          <h2 className="text-white font-bold text-lg mb-2">Business profile</h2>

          {[
            { key: 'name', label: 'Business name', placeholder: 'Adunola Fabrics' },
            { key: 'industry', label: 'Industry', placeholder: 'Fashion & Clothing' },
            { key: 'what_sells', label: 'What you sell', placeholder: 'Swiss lace, dry lace...' },
            { key: 'target', label: 'Target customer', placeholder: 'Women 25–45 in Lagos...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">{label}</label>
              <input
                value={(profile as any)[key]}
                onChange={e => setProfile({ ...profile, [key]: e.target.value } as Profile)}
                placeholder={placeholder}
                className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
              />
            </div>
          ))}

          {/* Monthly goal */}
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">
              Goal this month <span className="text-[#E8622A]">(update monthly)</span>
            </label>
            <div className="space-y-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setProfile({ ...profile, goal: g.value as any })}
                  className={`w-full p-3.5 rounded text-left text-sm border transition font-bold ${
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
            className="w-full bg-[#E8622A] text-white py-3.5 rounded-lg font-bold transition disabled:opacity-40 hover:bg-[#D55520]"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
