import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: generations } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1 font-semibold">Post Archives</p>
          <h1 className="text-3xl font-bold text-white mb-1">History</h1>
        </div>

        {!generations?.length ? (
          <p className="text-[#7A7888] text-sm">No generations yet. Start from your weekly plan.</p>
        ) : (
          <div className="space-y-3">
            {generations?.map((gen) => (
              <div key={gen.id} className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-5 hover:border-[#E8622A]/40 transition duration-150">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-white text-sm font-bold leading-snug">{gen.idea_prompt}</p>
                  <span className="text-[#7A7888] text-xs flex-shrink-0 font-medium">
                    {format(new Date(gen.created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-[#7A7888] text-xs line-clamp-2 leading-relaxed font-medium whitespace-pre-wrap">{gen.output}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
