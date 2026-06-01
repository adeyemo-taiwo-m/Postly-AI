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
    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }

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
      <div className="w-full max-w-md bg-[#18181E] border border-[#2E2E38] p-8 md:p-12 rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-[#7A7888] mb-8">Log in to see your marketing plan.</p>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
            />
          </div>
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-2 bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in...
              </>
            ) : 'Log in'}
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
