'use client'
import { useState, useEffect, Suspense } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

function GenerateContent() {
  const params = useParams()
  const planItemId = params.planItemId as string
  const searchParams = useSearchParams()
  const planId = searchParams.get('planId')
  const initialIdea = searchParams.get('idea') || ''
  const router = useRouter()

  const [idea, setIdea] = useState(initialIdea)
  const [extraDetail, setExtraDetail] = useState('')
  const [output, setOutput] = useState('')
  const [saved, setSaved] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  const { complete, completion, isLoading } = useCompletion({
    api: '/api/generate',
    onFinish: async (prompt, result) => {
      try {
        // Save to generations table
        const res = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_item_id: planItemId,
            idea_prompt: idea,
            extra_detail: extraDetail || null,
            output: result,
          }),
        })
        const data = await res.json()
        const generation = data.generation

        // Link generation to plan item
        if (planId && generation) {
          await fetch(`/api/plan/${planId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: planItemId, generation_id: generation.id }),
          })
        }
        setOutput(result)
        setSaved(true)
      } catch (err) {
        console.error('Error saving generation:', err)
      }
    },
    onError: (err) => {
      if (err.message.includes('402')) {
        setLimitReached(true)
      }
    },
  })

  const handleGenerate = async () => {
    if (!idea) return
    setSaved(false)
    await complete('', {
      body: {
        mode: 'content',
        calendarIdea: idea,
        extraDetail,
      },
    })
  }

  const displayOutput = completion || output

  // Parse sections from output
  const sections = parseOutputSections(displayOutput)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (limitReached) {
    return (
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-[#18181E] border border-[#2E2E38] p-8 md:p-12 rounded-xl">
          <p className="text-4xl mb-4">⚡</p>
          <h2 className="text-2xl font-bold text-white mb-2">You've used all your generations</h2>
          <p className="text-[#7A7888] mb-6">Upgrade to keep creating content this month.</p>
          <button
            onClick={() => router.push('/settings?upgrade=true')}
            className="bg-[#E8622A] text-white px-6 py-3 rounded font-semibold hover:bg-[#D55520] transition"
          >
            Upgrade now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D10] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="text-[#7A7888] hover:text-white text-sm mb-6 flex items-center gap-2 transition font-semibold"
        >
          ← Back to plan
        </button>

        <div className="mb-6">
          <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1 font-semibold">Content Suite</p>
          <h1 className="text-3xl font-bold text-white mb-1">Write your content</h1>
        </div>

        {/* Input area */}
        <div className="space-y-4 mb-6 bg-[#18181E] border border-[#2E2E38] p-6 rounded-xl">
          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">
              What this post is about
            </label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              rows={3}
              placeholder="Paste today's plan idea here, or write your own..."
              className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] resize-none transition"
            />
          </div>

          <div>
            <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block font-semibold">
              Extra details (optional)
            </label>
            <input
              value={extraDetail}
              onChange={e => setExtraDetail(e.target.value)}
              placeholder="Price, offer deadline, location, event name..."
              className="w-full bg-[#0D0D10] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] transition"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !idea}
            className="w-full bg-[#E8622A] text-white font-semibold p-3 rounded transition disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#D55520]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Writing...
              </>
            ) : 'Write it ✦'}
          </button>
        </div>

        {/* Output sections */}
        {displayOutput && (
          <div className="space-y-4">
            {sections.instagram && (
              <OutputSection
                title="Instagram Caption"
                content={sections.instagram}
                onCopy={() => copyToClipboard(sections.instagram)}
                accent="pink"
              />
            )}
            {sections.whatsapp && (
              <OutputSection
                title="WhatsApp Version"
                content={sections.whatsapp}
                onCopy={() => copyToClipboard(sections.whatsapp)}
                accent="green"
              />
            )}
            {sections.hashtags && (
              <OutputSection
                title="Hashtags"
                content={sections.hashtags}
                onCopy={() => copyToClipboard(sections.hashtags)}
                accent="orange"
              />
            )}

            {/* Copy all */}
            <button
              onClick={() => copyToClipboard(displayOutput)}
              className="w-full border border-[#2E2E38] text-[#7A7888] hover:text-white hover:border-[#3D3D4A] p-3 rounded text-sm transition font-semibold"
            >
              Copy everything
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function OutputSection({
  title,
  content,
  onCopy,
  accent,
}: {
  title: string
  content: string
  onCopy: () => void
  accent: 'pink' | 'green' | 'orange'
}) {
  const [copied, setCopied] = useState(false)
  const accentColors = {
    pink: 'text-pink-400 border-pink-500/20',
    green: 'text-[#2D9E72] border-[#2D9E72]/20',
    orange: 'text-[#E8622A] border-[#E8622A]/20',
  }

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`bg-[#18181E] border border-[#2E2E38] rounded-lg overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2E2E38] bg-[#1B1B23]">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accentColors[accent].split(' ')[0]}`}>
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="text-[#7A7888] hover:text-white text-xs transition font-semibold"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <p className="text-[#E2E0EC] text-sm leading-relaxed whitespace-pre-wrap font-medium">{content}</p>
      </div>
    </div>
  )
}

function parseOutputSections(text: string) {
  const instagram = text.match(/\*\*INSTAGRAM CAPTION\*\*\s*([\s\S]*?)(?=\*\*WHATSAPP|$)/i)?.[1]?.trim() ?? ''
  const whatsapp = text.match(/\*\*WHATSAPP VERSION\*\*\s*([\s\S]*?)(?=\*\*HASHTAGS|$)/i)?.[1]?.trim() ?? ''
  const hashtags = text.match(/\*\*HASHTAGS\*\*\s*([\s\S]*?)$/i)?.[1]?.trim() ?? ''
  
  // Backups if markers are not matched perfectly
  if (!instagram && !whatsapp && !hashtags) {
    return { instagram: text, whatsapp: '', hashtags: '' }
  }
  return { instagram, whatsapp, hashtags }
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}
