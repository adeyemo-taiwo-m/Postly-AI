# POSTLY AI STYLE GUIDE
### The single source of truth for all visual decisions in the Postly AI product
**Version:** 1.0 | **Stack:** Next.js 14+ + Tailwind CSS | **Theme:** Dark

> **For AI assistants and developers:** Read this entire file before touching any component. Every styling decision — color, spacing, typography, radius, shadow, state — is defined here. Never hardcode values that exist as tokens. Never invent styles not in this guide.

---

## 0 — CORE PRINCIPLE

Postly AI is a **marketing assistant for Nigerian SMEs**. The aesthetic is **refined dark editorial** — bold but approachable, professional but not corporate. Every design decision prioritizes: clarity of action, warmth of communication, and the feeling that this tool was made specifically for Nigerian business owners.

One rule above all: **use the token system. Never hardcode hex colors or arbitrary px values in JSX/TSX.**

---

## 1 — COLOR SYSTEM

### 1.1 Background Layers (deepest → shallowest)

| Token | Hex | Tailwind Class | Used For |
|-------|-----|----------------|----------|
| bg-base | `#0D0D10` | `bg-postly-bg` | Page background, outermost layer |
| bg-surface | `#18181E` | `bg-postly-surface` | Cards, inputs, nav items, sidebars |
| bg-surface2 | `#1B1B23` | `bg-postly-surface2` | Elevated cards, hover states |

**Layering rule:** Each surface must sit on a layer darker than itself. Never place bg-surface directly on bg-surface.

### 1.2 Accent & Semantic Colors

| Token | Hex | Tailwind Class | Used For |
|-------|-----|----------------|----------|
| accent | `#E8622A` | `text-postly-accent` / `bg-postly-accent` | Primary CTA buttons, active states, today's plan highlight, key links |
| accent-hover | `#D55520` | `bg-postly-accent-hover` | Button hover state |
| accent-dim | `rgba(232,98,42,0.10)` | `bg-postly-accent/10` | Badge backgrounds, card tints, icon containers, selected states |
| accent-border | `rgba(232,98,42,0.40)` | `border-postly-accent/40` | Hover borders, focus rings (subtle) |
| green | `#2D9E72` | `text-postly-green` | Completed/done states, positive indicators, success feedback, savings |
| green-dim | `rgba(45,158,114,0.10)` | `bg-postly-green/10` | Completed card tints, success badge backgrounds |

### 1.3 Platform Colors

| Platform | Color | Tailwind | Used For |
|----------|-------|----------|----------|
| Instagram | `#f472b6` (pink-400) | `text-pink-400` | Platform label on calendar cards |
| WhatsApp | `#4ade80` (green-400) | `text-green-400` | Platform label on calendar cards |
| Both | `#E8622A` | `text-postly-accent` | Dual-platform label on calendar cards |

### 1.4 Text Colors

| Token | Hex | Tailwind Class | Used For |
|-------|-----|----------------|----------|
| text-primary | `#FFFFFF` | `text-white` | Headings, card titles, stat values, active labels |
| text-secondary | `#E2E0EC` | `text-postly-text` | Body text, idea text in plan cards, captions |
| text-muted | `#A09EB8` | `text-postly-muted` | Labels, secondary info, section headings, subtitles |
| text-dim | `#7A7888` | `text-postly-dim` | Placeholders, tertiary text, timestamps, nav inactive |

### 1.5 Border Colors

| Token | Hex | Tailwind Class | Used For |
|-------|-----|----------------|----------|
| border-default | `#2E2E38` | `border-postly-border` | All default card and input borders |
| border-mid | `#3D3D4A` | `border-postly-border-mid` | Hover borders on checkmarks and subtle elements |

### 1.6 Post Type Badge Colors

These map to the `type` field on a `PlanItem`. Compute at render using `TYPE_BADGE_CLASSES`:

```typescript
export const TYPE_BADGE_CLASSES: Record<string, string> = {
  'Promo':              'bg-[#E8622A]/10 text-[#E8622A] border border-[#E8622A]/20',
  'Story':              'bg-blue-900/20 text-blue-400 border border-blue-500/20',
  'Engagement':         'bg-purple-900/20 text-purple-400 border border-purple-500/20',
  'Campaign':           'bg-yellow-900/20 text-yellow-400 border border-yellow-500/20',
  'Behind the scenes':  'bg-[#2D9E72]/10 text-[#2D9E72] border border-[#2D9E72]/20',
  'Education':          'bg-cyan-900/20 text-cyan-400 border border-cyan-500/20',
};
```

Apply to: type pills on weekly plan cards and history items.

### 1.7 Error & Alert Colors

| Purpose | Background | Border | Text |
|---------|------------|--------|------|
| Error banner | `bg-red-900/20` | `border border-red-500/30` | `text-red-400` |
| Upgrade prompt | `bg-[#E8622A]/10` | `border border-[#E8622A]/30` | `text-white` |

---

## 2 — TYPOGRAPHY

### 2.1 Font Stack

Postly AI uses the same fonts defined in the implementation. Import these in `src/app/layout.tsx` or global CSS:

```css
/* No custom font import required — Postly uses Tailwind defaults */
/* However, for the landing page headline, apply font-black and tracking-tight */
```

The product uses the **system sans-serif stack** via Tailwind's default `font-sans`. No third-party display font is used in v1. The personality comes from weight and spacing, not font selection.

| Role | Font | Tailwind Class | Used For |
|------|------|----------------|----------|
| All text | System sans-serif | `font-sans` (default) | All UI — no overrides needed |

**Rules:**
- Headlines always use `font-bold` or `font-black`
- Labels always use `font-semibold` + `uppercase` + `tracking-widest`
- Body text uses the default weight `font-normal`
- Buttons always use `font-semibold`

### 2.2 Type Scale

| Element | Size | Weight | Tailwind Class |
|---------|------|--------|----------------|
| Landing hero | 48–64px | 900 | `text-5xl md:text-6xl font-black tracking-tight leading-none` |
| Page title | 30px | 700 | `text-3xl font-bold` |
| Card title / heading | 24px | 700 | `text-2xl font-bold` |
| Section subheading | 18–20px | 700 | `text-xl font-bold` |
| Body / idea text | 14px | 400 | `text-sm` |
| Button label | 14px | 600 | `text-sm font-semibold` |
| Badge / pill | 10px | 500 | `text-[10px] font-medium` |
| Section label (caps) | 10–12px | 400–500 | `text-xs uppercase tracking-widest` |
| Meta / timestamp | 12px | 400 | `text-xs text-postly-dim` |
| Input text | 14–16px | 400 | `text-sm` or default |
| Placeholder | 14px | 400 | `placeholder-postly-dim` |

**Critical:** Section labels (e.g. "This week's plan", "Your plan") always use `text-xs uppercase tracking-widest text-postly-accent`. This is the brand's signature typographic treatment.

---

## 3 — SPACING SYSTEM

**Rule:** Only use values from Tailwind's default scale. Never write `style={{ padding: '13px' }}` or `mt-[17px]`.

| Token | Value | Tailwind | Used For |
|-------|-------|----------|----------|
| space-1 | 4px | `p-1` / `gap-1` | Icon internal padding |
| space-2 | 8px | `p-2` / `gap-2` | Inline icon gap, tight row gap |
| space-3 | 12px | `p-3` / `gap-3` | Nav item padding, badge padding |
| space-4 | 16px | `p-4` / `gap-4` | Card body padding (compact), grid gap |
| space-5 | 20px | `p-5` / `gap-5` | Card body padding (standard) |
| space-6 | 24px | `p-6` / `gap-6` | Main content padding, section gap |
| space-8 | 32px | `p-8` / `gap-8` | Page section separation, landing page sections |
| space-12 | 48px | `p-12` | Login/onboarding panel padding |
| space-20 | 80px | `py-20` | Landing page hero padding |

### 3.1 Layout Constants

| Zone | Property | Value |
|------|----------|-------|
| TopBar | `height` | `56px` (h-14) |
| Main content | `padding` | `16–32px` (p-4 md:p-8) |
| Max content width (dashboard) | `max-width` | `672px` (max-w-2xl) |
| Max content width (onboarding) | `max-width` | `512px` (max-w-lg) |
| Max content width (auth) | `max-width` | `448px` (max-w-md) |
| Max content width (landing) | `max-width` | `768px` (max-w-3xl) |
| Input padding | `padding` | `12px` (p-3) |
| Button padding (standard) | `padding` | `12px` (p-3) |
| Button padding (small) | `padding` | `6px 12px` (px-3 py-1.5) |
| Card inner | `padding` | `16px` (p-4) |

---

## 4 — BORDER RADIUS

| Name | Value | Used For |
|------|-------|----------|
| sm | 4px (`rounded`) | Inputs, buttons, small elements |
| md | 8px (`rounded-lg`) | Badges, pills, icon containers |
| xl | 12px (`rounded-xl`) | Main cards, panels, demo containers |
| full | 9999px (`rounded-full`) | Progress bar fills, spinner, live dots |

**Special rule:** Plan item cards on the dashboard use `rounded-lg overflow-hidden`. The content inside is flush to the card edges — no inner padding on the row wrapper itself; instead, padding goes on the inner flex container.

---

## 5 — BORDERS

All default borders use `#2E2E38` (`border-postly-border`).

| Context | Style |
|---------|-------|
| Card default | `border border-postly-border` |
| Card — today highlight | `border border-[#E8622A]/40 shadow-[0_0_0_1px_rgba(232,98,42,0.1)]` |
| Card — completed | `border border-postly-border opacity-50` |
| Input default | `border border-postly-border` |
| Input focus | `focus:border-[#E8622A]` |
| Checkmark button default | `border border-[#3D3D4A]` |
| Checkmark button completed | `bg-[#2D9E72] border-[#2D9E72]` |
| Upgrade prompt | `border border-[#E8622A]/30` |
| Error banner | `border border-red-500/30` |
| Nav bar | `border-b border-postly-border` |
| Section separator | `border-b border-postly-border` |
| Onboarding step bar (active) | `bg-[#E8622A]` |
| Onboarding step bar (inactive) | `bg-[#2E2E38]` |

---

## 6 — SHADOWS

| Name | Value | Used For |
|------|-------|----------|
| `shadow-today` | `0 0 0 1px rgba(232,98,42,0.1)` combined with `border border-[#E8622A]/40` | Today's plan card highlight ring |

No elaborate box shadows in the v1 product. Cards are distinguished by background and border color, not shadows.

---

## 7 — COMPONENT SPECIFICATIONS

### 7.1 Plan Item Card (Weekly Dashboard)

```tsx
<div className={`border rounded-lg overflow-hidden transition-all ${
  item.completed
    ? 'opacity-50 border-[#2E2E38]'
    : isToday
    ? 'border-[#E8622A]/40 shadow-[0_0_0_1px_rgba(232,98,42,0.1)]'
    : 'border-[#2E2E38]'
}`}>
  <div className={`flex items-center gap-3 p-4 ${
    isToday ? 'bg-[rgba(232,98,42,0.05)]' : 'bg-[#18181E]'
  }`}>
    {/* Day label */}
    <div className="w-12 text-center flex-shrink-0">
      <p className={`text-xs font-bold uppercase tracking-wide ${
        isToday ? 'text-[#E8622A]' : 'text-[#7A7888]'
      }`}>{item.day.slice(0, 3)}</p>
      {isToday && <p className="text-[#E8622A] text-[10px]">Today</p>}
    </div>
    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {/* Platform label */}
        <span className={`text-xs font-medium ${PLATFORM_COLORS[item.platform]}`}>
          {item.platform}
        </span>
        {/* Type badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded ${TYPE_BADGE_CLASSES[item.type]}`}>
          {item.type}
        </span>
      </div>
      <p className="text-white text-sm leading-snug">{item.idea}</p>
    </div>
    {/* Actions */}
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Write it CTA */}
      <button className="bg-[#E8622A] text-white text-xs px-3 py-1.5 rounded font-medium hover:bg-[#D55520] transition whitespace-nowrap">
        Write it
      </button>
      {/* Complete button */}
      <button className={`w-7 h-7 rounded border transition flex items-center justify-center ${
        item.completed
          ? 'bg-[#2D9E72] border-[#2D9E72] text-white'
          : 'border-[#3D3D4A] text-[#7A7888] hover:border-[#2D9E72] hover:text-[#2D9E72]'
      }`}>✓</button>
    </div>
  </div>
</div>
```

### 7.2 Progress Bar (Weekly Completion)

```tsx
// Track
<div className="h-1 bg-[#2E2E38] rounded-full mb-8">
  // Fill
  <div
    className="h-1 bg-[#E8622A] rounded-full transition-all"
    style={{ width: `${(completedCount / totalCount) * 100}%` }}
  />
</div>
```

- Track height: always `h-1` (4px)
- Track background: `bg-[#2E2E38]`
- Fill color: always accent `bg-[#E8622A]`
- Transition: `transition-all` for smooth updates

### 7.3 Button — Primary (CTA)

```tsx
<button className="bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-50">
  {label}
</button>

// Full-width variant (auth pages, onboarding, generate screen)
<button className="w-full bg-[#E8622A] hover:bg-[#D55520] text-white font-semibold p-3 rounded transition disabled:opacity-40">
  {label}
</button>
```

### 7.4 Button — Secondary / Ghost

```tsx
<button className="border border-[#2E2E38] text-[#7A7888] hover:text-white hover:border-[#3D3D4A] p-3 rounded text-sm transition">
  {label}
</button>
```

### 7.5 Button — Back Navigation

```tsx
<button className="text-[#7A7888] hover:text-white text-sm flex items-center gap-2 transition">
  ← Back to plan
</button>
```

### 7.6 Text Input

```tsx
<input
  className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
/>
```

### 7.7 Textarea

```tsx
<textarea
  className="w-full bg-[#18181E] border border-[#2E2E38] rounded p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A] resize-none"
  rows={3}
/>
```

### 7.8 Label (Section Label / Form Label)

```tsx
// Section label (above the page title, always accent colored)
<p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1">
  This week's plan
</p>

// Form field label
<label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-2 block">
  Business name
</label>
```

### 7.9 Error Banner

```tsx
<div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded mb-4 text-sm">
  {error}
</div>
```

### 7.10 Upgrade Prompt Banner

```tsx
<div className="bg-[#E8622A]/10 border border-[#E8622A]/30 rounded-xl p-6 text-center">
  <h3 className="text-xl font-bold text-white mb-2">{headline}</h3>
  <p className="text-[#A09EB8] text-sm mb-4">{description}</p>
  <button className="bg-[#E8622A] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#D55520] transition">
    {cta}
  </button>
</div>
```

### 7.11 Output Section Card (Content Generation Screen)

```tsx
<div className="bg-[#18181E] border border-[#2E2E38] rounded-lg overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2E2E38]">
    <span className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>
      {title}  {/* e.g. "Instagram Caption" */}
    </span>
    <button className="text-[#7A7888] hover:text-white text-xs transition">
      {copied ? '✓ Copied!' : 'Copy'}
    </button>
  </div>
  {/* Body */}
  <div className="p-4">
    <p className="text-[#E2E0EC] text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
  </div>
</div>
```

Output section accent colors by platform:
- **Instagram Caption:** `text-pink-400`
- **WhatsApp Version:** `text-[#2D9E72]`
- **Hashtags:** `text-[#E8622A]`

### 7.12 Loading Spinner

```tsx
// Full-screen loading state
<div className="min-h-screen bg-[#0D0D10] flex items-center justify-center">
  <div className="text-center">
    <div className="w-8 h-8 border-2 border-[#E8622A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
    <p className="text-[#7A7888] text-sm">{message}</p>
  </div>
</div>

// Inline button spinner
<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
```

### 7.13 Plan Subscription Badge (Settings)

```tsx
<span className="bg-[#E8622A]/10 text-[#E8622A] text-xs px-3 py-1 rounded border border-[#E8622A]/20 font-medium capitalize">
  {plan}  {/* "free" | "starter" | "growth" */}
</span>
```

### 7.14 Onboarding Step Indicator

```tsx
<div className="flex gap-2 mb-8">
  {[1, 2, 3].map(s => (
    <div
      key={s}
      className={`h-1 flex-1 rounded-full transition-colors ${
        s <= currentStep ? 'bg-[#E8622A]' : 'bg-[#2E2E38]'
      }`}
    />
  ))}
</div>
```

### 7.15 Onboarding Selection Button (Industry / Goal)

```tsx
// Two-column grid tile (industry selection)
<button
  onClick={() => update('industry', ind)}
  className={`p-2 rounded text-sm text-left border transition ${
    selected
      ? 'bg-[#E8622A]/10 border-[#E8622A] text-[#E8622A]'
      : 'bg-[#18181E] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
  }`}
>
  {label}
</button>

// Full-width tile (goal / tone selection)
<button
  className={`w-full p-4 rounded text-left border transition ${
    selected
      ? 'bg-[#E8622A]/10 border-[#E8622A] text-white'
      : 'bg-[#18181E] border-[#2E2E38] text-[#A09EB8] hover:border-[#E8622A]/40'
  }`}
>
  {label}
</button>
```

### 7.16 TopBar / Navigation

```tsx
<nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[rgba(13,13,16,0.95)] backdrop-blur border-b border-[#2E2E38] flex items-center justify-between px-6">
  {/* Brand */}
  <Link href="/dashboard" className="font-bold text-white">
    Postly<span className="text-[#E8622A] italic">AI</span>
  </Link>
  {/* Nav links */}
  <div className="flex items-center gap-6">
    <Link className="text-[#7A7888] hover:text-white text-sm transition">Plan</Link>
    <Link className="text-[#7A7888] hover:text-white text-sm transition">History</Link>
    <Link className="text-[#7A7888] hover:text-white text-sm transition">Settings</Link>
    <button className="text-[#7A7888] hover:text-white text-sm transition">Log out</button>
  </div>
</nav>
```

**Brand name rule:** "Postly" in `text-white font-bold`, "AI" in `text-[#E8622A] italic`. This is the only italicised element in the product.

### 7.17 History Item Card

```tsx
<div className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-4">
  <div className="flex items-start justify-between gap-4 mb-2">
    <p className="text-white text-sm font-medium">{gen.idea_prompt}</p>
    <span className="text-[#7A7888] text-xs flex-shrink-0">{formattedDate}</span>
  </div>
  <p className="text-[#7A7888] text-xs line-clamp-2">{gen.output.slice(0, 120)}...</p>
</div>
```

### 7.18 Landing Page Demo Input Row

```tsx
<div className="bg-[#18181E] border border-[#2E2E38] rounded-xl p-6 mb-8">
  <label className="text-[#A09EB8] text-xs uppercase tracking-widest mb-3 block">
    What does your business sell?
  </label>
  <div className="flex gap-3">
    <input
      className="flex-1 bg-[#0D0D10] border border-[#2E2E38] rounded-lg p-3 text-white placeholder-[#7A7888] focus:outline-none focus:border-[#E8622A]"
      placeholder="e.g. Nigerian wigs and braids in Port Harcourt"
    />
    <button className="bg-[#E8622A] hover:bg-[#D55520] text-white px-5 rounded-lg font-semibold transition disabled:opacity-40 whitespace-nowrap">
      See your week →
    </button>
  </div>
</div>
```

### 7.19 Landing Page Sample Plan Card

```tsx
<div className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-4">
  <div className="flex items-center gap-2 mb-1">
    <span className="text-[#E8622A] text-xs font-bold">{item.day}</span>
    <span className="text-[#7A7888] text-xs">·</span>
    <span className="text-[#7A7888] text-xs">{item.platform}</span>
    <span className="text-[#7A7888] text-xs">·</span>
    <span className="text-[#7A7888] text-xs">{item.type}</span>
  </div>
  <p className="text-white text-sm">{item.idea}</p>
</div>
```

### 7.20 Settings Subscription Progress Bar

```tsx
<div className="bg-[#18181E] border border-[#2E2E38] rounded-lg p-5 mb-8">
  {/* Plan name and badge row */}
  <div className="flex items-center justify-between mb-3">
    <span className="text-[#A09EB8] text-xs uppercase tracking-widest">Your plan</span>
    {/* Plan badge — see 7.13 */}
  </div>
  {/* Generation usage bar */}
  <div className="h-2 bg-[#2E2E38] rounded-full mb-2">
    <div
      className="h-2 bg-[#E8622A] rounded-full"
      style={{ width: `${(remaining / limit) * 100}%` }}
    />
  </div>
  <p className="text-[#7A7888] text-xs">{remaining} generations remaining this month</p>
  {/* Upgrade button — only on free plan */}
  {plan === 'free' && (
    <button className="mt-4 w-full bg-[#E8622A] text-white py-2.5 rounded font-semibold text-sm hover:bg-[#D55520] transition">
      Upgrade — ₦2,500/month (beta price)
    </button>
  )}
</div>
```

---

## 8 — PAGE LAYOUTS

### 8.1 Auth Pages (Login / Signup)

```
[min-h-screen bg-[#0D0D10] flex items-center justify-center p-4]
  [max-w-md w-full]
    [h1 — page title]
    [p  — subtitle]
    [error banner — conditional]
    [input fields]
    [primary CTA button]
    [switch page link]
```

### 8.2 Onboarding

```
[min-h-screen bg-[#0D0D10] flex items-center justify-center p-4]
  [max-w-lg w-full]
    [Step indicator bar]
    [Step content — varies per step]
    [Back / Continue button row]
```

### 8.3 Dashboard (Weekly Plan)

```
[min-h-screen bg-[#0D0D10] p-4 md:p-8]
  [max-w-2xl mx-auto]
    [Section label + page title + completion count]
    [Progress bar]
    [Plan item cards — stacked, space-y-3]
    [Regenerate button]
```

### 8.4 Content Generation

```
[min-h-screen bg-[#0D0D10] p-4 md:p-8]
  [max-w-2xl mx-auto]
    [Back button]
    [Page title]
    [Idea textarea]
    [Extra detail input]
    [Write it CTA button]
    [Output sections — conditional, stacked]
      [Instagram Caption card]
      [WhatsApp Version card]
      [Hashtags card]
    [Copy everything button]
```

### 8.5 Settings

```
[min-h-screen bg-[#0D0D10] p-4 md:p-8]
  [max-w-xl mx-auto]
    [Page title]
    [Subscription card with plan badge + progress bar]
    [Profile form card — all fields + goal selector]
    [Save button]
```

### 8.6 History

```
[min-h-screen bg-[#0D0D10] p-4 md:p-8]
  [max-w-2xl mx-auto]
    [Page title]
    [Empty state — conditional]
    [History item cards — stacked, space-y-3]
```

### 8.7 Landing Page

```
[min-h-screen bg-[#0D0D10]]
  [Navbar — brand + log in link]
  [max-w-3xl mx-auto px-6 py-20]
    [text-center — badge pill + hero heading + subtext + price]
    [Demo input box]
    [Loading indicator — conditional]
    [Sample plan cards — conditional, stacked]
    [Upgrade CTA banner — conditional]
```

---

## 9 — INTERACTIVE STATES

Every interactive element must have visible hover and focus states. No exceptions.

| Element | Default | Hover | Focus / Active |
|---------|---------|-------|----------------|
| Card (plan item) | `border-[#2E2E38]` | No hover (static) | Today: `border-[#E8622A]/40` |
| Input | `border-[#2E2E38]` | No change | `border-[#E8622A]` |
| CTA Button | `bg-[#E8622A]` | `bg-[#D55520]` | Standard focus outline |
| Ghost Button | `border-[#2E2E38] text-dim` | `text-white border-[#3D3D4A]` | — |
| Nav link | `text-dim` | `text-white` | — |
| Onboarding tile | `border-[#2E2E38] text-muted` | `border-[#E8622A]/40` | `border-[#E8622A] bg-accent/10 text-[#E8622A]` |
| Checkmark button | `border-[#3D3D4A] text-dim` | `border-[#2D9E72] text-[#2D9E72]` | `bg-[#2D9E72] border-[#2D9E72] text-white` |
| Write it button | `bg-[#E8622A]` | `bg-[#D55520]` | — |
| Back nav | `text-dim` | `text-white` | — |

**All transitions:** `transition` (default 150ms). Never omit transitions on interactive elements.

---

## 10 — ANIMATIONS

```css
/* Standard Tailwind animate-spin for loading spinners */
.animate-spin { animation: spin 1s linear infinite; }

/* Tailwind animate-pulse for skeleton states */
.animate-pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
```

| Animation | Applied To |
|-----------|------------|
| `animate-spin` | Button loading spinner (`border-t-transparent rounded-full`) |
| `animate-spin` | Full-screen loading spinner during plan generation |
| `animate-pulse` | Skeleton loading states |
| `transition-all` | Progress bar width changes |
| `transition-colors` | Onboarding step bars |
| `transition` | All interactive elements (buttons, links, inputs) |

---

## 11 — CONSTANTS & UTILITIES

### 11.1 Platform Colors Map

```typescript
export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'text-pink-400',
  WhatsApp:  'text-green-400',
  Both:      'text-[#E8622A]',
};
```

### 11.2 Plan Limits

```typescript
export const PLAN_LIMITS: Record<string, number> = {
  free:    7,
  beta:    30,
  starter: 30,
  growth:  80,
};
```

### 11.3 Page Title Pattern

Every authenticated page title follows the same structure:

```tsx
<div className="mb-8">
  <p className="text-[#E8622A] text-xs uppercase tracking-widest mb-1">
    {contextLabel}   {/* e.g. "This week's plan" */}
  </p>
  <h1 className="text-3xl font-bold text-white mb-1">{pageTitle}</h1>
  <p className="text-[#7A7888] text-sm">{subtitle}</p>
</div>
```

---

## 12 — DO / DON'T RULES

### ✅ DO
- Use `bg-[#0D0D10]` as the page background on every screen
- Use `bg-[#18181E]` for all card and input surfaces
- Use `#E8622A` for all primary CTAs, active states, and the "today" highlight
- Use `#2D9E72` (green) only for completed/done states
- Use `text-xs uppercase tracking-widest` for all section labels — always
- Add `text-[#E8622A] italic` to the "AI" in "PostlyAI" brand name — always
- Use `border border-[#2E2E38]` as the default border on every card, input, and surface
- Use `focus:border-[#E8622A]` on every text input and textarea
- Add `transition` to every interactive element
- Add `disabled:opacity-40` or `disabled:opacity-50` to every button
- Use `font-semibold` on all button labels
- Use `flex-shrink-0` on icons and fixed-width elements inside flex rows
- Use `min-w-0` + `truncate` on flex children that could overflow
- Use `whitespace-nowrap` on the "Write it" button to prevent wrapping at small sizes
- Use `leading-snug` on idea text inside plan cards
- Use `line-clamp-2` on preview text in history cards

### ❌ DON'T
- Never use `#FFFFFF` for backgrounds — always `#0D0D10` or `#18181E`
- Never use colors outside the defined token system
- Never use generic AI aesthetics (purple gradients, white dashboards)
- Never put colored borders on cards except the "today" highlight card
- Never use `text-italic` anywhere except the brand name "AI" suffix
- Never omit `tracking-widest` from section labels styled in uppercase
- Never hardcode `font-size: 13px` or similar — use Tailwind scale classes
- Never use `transition-duration: 0` on interactive elements
- Never use `bg-white` or `text-black` anywhere in the product
- Never use emojis as decoration in UI chrome — only in AI-generated content output
- Never display raw price figures inline — always include the ₦ symbol

---

## 13 — TAILWIND CONFIG REFERENCE

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        postly: {
          bg:         '#0D0D10',
          surface:    '#18181E',
          surface2:   '#1B1B23',
          accent:     '#E8622A',
          'accent-hover': '#D55520',
          green:      '#2D9E72',
          border:     '#2E2E38',
          'border-mid': '#3D3D4A',
          text:       '#E2E0EC',
          muted:      '#A09EB8',
          dim:        '#7A7888',
        }
      }
    }
  },
  plugins: [],
}
```

---

## 14 — QUICK COMPONENT CHECKLIST

When reviewing or building any Postly AI component, verify:

- [ ] Page background is `bg-[#0D0D10]`
- [ ] All card and input surfaces use `bg-[#18181E]`
- [ ] All borders use `border-[#2E2E38]` (default)
- [ ] Primary buttons use `bg-[#E8622A]` with `hover:bg-[#D55520]`
- [ ] Section labels use `text-xs uppercase tracking-widest text-[#E8622A]`
- [ ] All inputs have `focus:border-[#E8622A] focus:outline-none`
- [ ] Type badges use `TYPE_BADGE_CLASSES` — never hardcoded per-component
- [ ] Platform colors use `PLATFORM_COLORS` map
- [ ] Brand name has `text-[#E8622A] italic` on the "AI" suffix
- [ ] Completed plan items have `opacity-50`
- [ ] Today's plan item has `border-[#E8622A]/40` and accent-tinted background
- [ ] Progress bars use `bg-[#2E2E38]` track + `bg-[#E8622A]` fill
- [ ] Loading spinners use `border-[#E8622A] border-t-transparent animate-spin`
- [ ] Every interactive element has a `transition` class
- [ ] Every button has `disabled:opacity-40` or `disabled:opacity-50`
- [ ] `font-semibold` is applied to all button labels
- [ ] Error banners use `bg-red-900/20 border border-red-500/30 text-red-400`

---

*Postly AI — STYLE_GUIDE.md v1.0*
*Built by Taiwo Adeyemo — Reference this file in every prompt when building or modifying Postly AI components.*
*Stop guessing styles. Start building consistently.*
