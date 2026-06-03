# 🚀 Postly AI

> **Your marketing plan, every Monday. Personalized AI-powered marketing for Nigerian small-to-medium enterprises (SMEs).**

Postly AI is a localized social media calendar planner and copywriting assistant built specifically for Nigerian business owners. It takes the guesswork out of content creation by generating complete 7-day marketing calendars and high-converting copywriting (Instagram captions, hashtags, and personal WhatsApp broadcast messages) infused with Nigerian cultural context, local vocabulary, and seasonal buying behaviors.

---

## ✨ Features

- **📅 7-Day Social Media Calendar**: Generates specific, actionable post ideas for each day of the week (Monday to Sunday) tailored to what you sell.
- **✍️ Localized Copywriting Engine**: Automatically generates authentic, high-converting copy:
  - **Instagram Caption**: Conversational, engaging, and culturally relevant with emoji integration.
  - **WhatsApp Broadcast**: Rewritten for a personal, trusted-friend vibe (no spam energy).
  - **Local Hashtags**: Tailored mix of Nigerian location-based, industry-specific, and trending campaign tags.
- **🇳🇬 Localized Buying Context**: Infused with seasonal Nigerian events (e.g., Detty December, Sallah, Valentine's, Easter, Back-to-school) and automated **Payday detection** (boosting promos between the 25th and 5th of each month).
- **🎯 Goal-Driven Campaigns**: Plan suggestions change based on your primary monthly goal:
  - Increase Sales (promos, anchoring, urgency)
  - Get More Enquiries (curiosity, clear CTAs)
  - Grow Followers (shareable, relatable content)
  - Launch a Product (Tease ➡️ Reveal ➡️ Launch ➡️ Social Proof)
  - Retain Customers (appreciation, behind-the-scenes)
- **🗣️ Custom Brand Tones**: Choose a voice that fits your brand: *Professional*, *Casual*, *Playful*, or *Bold*.
- **💳 Paystack Subscriptions Integration**: Native support for Nigerian cards, recurring billing, and automated tier limit enforcement.
- **🔐 Secure Auth & User Profiles**: Handled via Supabase Authentication and user state tables.

---

## 🛠️ Tech Stack

- **Core Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **AI Integration:** [Vercel AI SDK](https://sdk.vercel.ai/) & [Google Gemini 2.0 Flash API](https://aistudio.google.com/) (using `@ai-sdk/google`)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Payments Engine:** [Paystack](https://paystack.com/)
- **State Management & Helpers:** `date-fns`, `uuid`, `lucide-react`
- **Hosting:** [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### 📋 Prerequisites

Before running the application, make sure you have:
1. **Node.js** installed (v18+ recommended).
2. A **Supabase** project set up.
3. A **Google AI Studio (Gemini)** API key (available for free).
4. A **Paystack** developer account (Test mode works fine).

---

### ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adeyemo-taiwo-m/Postly-AI.git
   cd Postly-AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add the following keys:
   ```env
   # Supabase Credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # Gemini API Key (obtain from Google AI Studio)
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

   # Paystack API Keys
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
   PAYSTACK_SECRET_KEY=sk_test_your_secret_key

   # App Base URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🗄️ Supabase Database Schema

To set up your database, run the following SQL scripts in the **Supabase SQL Editor**:

### 1. `profiles` Table
```sql
create table profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade unique,
  name       text not null,
  industry   text not null,
  what_sells text not null,
  target     text not null,
  tone       text not null default 'Professional',
  goal       text not null default 'increase_sales',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id);
```

### 2. `plans` Table
```sql
create table plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  week_start date not null,
  items      jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table plans enable row level security;

create policy "Users can view own plans" on plans for select using (auth.uid() = user_id);
create policy "Users can insert own plans" on plans for insert with check (auth.uid() = user_id);
create policy "Users can update own plans" on plans for update using (auth.uid() = user_id);
```

### 3. `generations` Table
```sql
create table generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  plan_item_id text,
  idea_prompt  text not null,
  extra_detail text,
  output       text not null,
  created_at   timestamptz default now()
);

alter table generations enable row level security;

create policy "Users can view own generations" on generations for select using (auth.uid() = user_id);
create policy "Users can insert own generations" on generations for insert with check (auth.uid() = user_id);
```

### 4. `subscriptions` Table
```sql
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade unique,
  plan            text not null default 'free',
  paystack_sub_id text,
  paystack_email_token text,
  status          text not null default 'active',
  gen_count       int default 0,
  period_start    timestamptz default now(),
  period_end      timestamptz,
  created_at      timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);
```

### 5. Auto-Create Subscription on Signup Trigger
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan, status, gen_count)
  values (new.id, 'free', 'active', 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 📂 Project Structure

```text
src/
├── app/
│   ├── (auth)/             # Login and Signup pages
│   ├── (dashboard)/        # Main dashboard workspace, history, settings
│   ├── api/
│   │   ├── generate/       # Google Gemini streaming AI engine
│   │   ├── profile/        # Manage user profile endpoints
│   │   ├── plan/           # CRUD endpoints for weekly plans
│   │   ├── subscription/   # Pricing tiers and Paystack integrations
│   │   └── webhooks/       # Paystack billing events handler
│   ├── layout.tsx
│   └── page.tsx            # Main landing page & demo playground
├── components/
│   ├── ui/                 # Core visual elements
│   ├── plan/               # Interactive calendar UI
│   ├── generate/           # Copier/copywriter layout views
│   └── layout/             # Sidebar and page wrappers
├── lib/
│   ├── ai/
│   │   ├── nigerian-context.ts   # Payday & monthly cultural data logic
│   │   ├── prompts.ts            # System and task prompt builders
│   │   └── goal-map.ts           # Goal mapping dictionary
│   ├── supabase/           # Server/Client setup and auth middleware
│   └── utils.ts            # Formatting & parsing helper functions
├── types/                  # Shared Typescript typings
└── middleware.ts           # Route guard and user session refresher
```

---

## 💳 Plan Limits & Paystack Setup

We offer 4 flexible tiers (configured in `src/types/index.ts`):
- **Free**: 7 content generations per month.
- **Beta** (₦2,500/month): 30 content generations per month.
- **Starter** (₦5,000/month): 30 content generations per month.
- **Growth** (₦12,000/month): 80 content generations per month.

Paystack pricing is handled in *kobo* units internally. Make sure to define subscription plans on your Paystack Dashboard matching the corresponding pricing plans and configure webhooks targeting your deployment URL `https://your-domain.com/api/webhooks/paystack` to keep subscriptions in sync.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
