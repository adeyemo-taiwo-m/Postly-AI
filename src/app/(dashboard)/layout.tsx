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
        <Link href="/dashboard" className="font-bold text-white text-lg">
          Postly<span className="text-[#E8622A] italic">AI</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-[#7A7888] hover:text-white text-sm transition font-semibold">
            Plan
          </Link>
          <Link href="/history" className="text-[#7A7888] hover:text-white text-sm transition font-semibold">
            History
          </Link>
          <Link href="/settings" className="text-[#7A7888] hover:text-white text-sm transition font-semibold">
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
