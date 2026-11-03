# মেস খাতা (Mess Khata)

মেসের মিল, বাজার, জমা ও মাসিক হিসাবের একটি সহজ, বাংলা-ফার্স্ট অ্যাপ। কোনো বিজ্ঞাপন নেই, কয়েন নেই — ডেটা থাকে আপনার নিজের Supabase প্রজেক্টে।

> **এক নজরে:** React + TypeScript + Vite দিয়ে বানানো PWA। Supabase free tier-এ চলে। ম্যানেজার মেস তৈরি করবে, সদস্যরা ইনভাইট কোড দিয়ে যোগ দিয়ে নিজেরাই মিল/বাজার/জমা এন্ট্রি করতে পারবে।

---

## ফিচার

- **সবাই এন্ট্রি করতে পারবে** — ম্যানেজার ও সদস্য, সবাই মিল, বাজার, জমা যোগ/এডিট করতে পারে।
- **দৈনিক মিল** — প্রতিদিন সব সদস্যের মিল এক স্ক্রিনে, ০.৫ ধাপে (১.৫ মিলও দেওয়া যায়)।
- **বাজার ও অন্যান্য খরচ** — বাড়ি ভাড়া, ওয়াইফাই, গ্যাস, বিদ্যুৎ, পানি, সার্ভিস চার্জ আলাদা। প্রতিটি এন্ট্রিতে **কে বাজার/খরচ করেছেন** সেই সদস্যও সংরক্ষণ হয়।
- **জমা** — কে কত টাকা মেসে জমা দিল, তারিখ ও নোটসহ।
- **অটো হিসাব** — মিল রেট, প্রতি সদস্যের বিল, জমা, ব্যালেন্স (দিতে হবে/পাওনা)।
- **মাসিক সারসংক্ষেপ** — CSV ডাউনলোড, প্রিন্ট/PDF, শেয়ার।
- **মাল্টি-ইউজার Cloud** — Supabase Auth + Row Level Security, রিয়েলটাইম আপডেট।
- **ইনভাইট কোড** — ম্যানেজার কোড রিজেনারেট, সদস্য সরানো এবং **ম্যানেজার বদলানো** করতে পারবে।
- **PWA** — ফোনে ইনস্টল করা যায়, মোবাইল-রেসপনসিভ।
- **ডেমো মোড** — Supabase ছাড়াই ডামি ডেটা দিয়ে পুরো অ্যাপ চালিয়ে দেখা যায়।

---

## হিসাবের নিয়ম

```
মিল রেট = (মোট বাজার + “মিল রেটে যোগ” করা অন্যান্য খরচ) ÷ মোট মিল

প্রতি সদস্যের মিল খরচ = নিজের মিল × মিল রেট
প্রতি সদস্যের অন্যান্য ভাগ = (যেসব অন্যান্য খরচ মিল রেটে যোগ করা হয়নি) ÷ মাসের সক্রিয় সদস্য
মোট বিল = মিল খরচ + অন্যান্য ভাগ
ব্যালেন্স = জমা − মোট বিল
```

- ব্যালেন্স **ধনাত্মক** = সদস্যের পাওনা (অ্যাডভান্স আছে)।
- ব্যালেন্স **ঋণাত্মক** = সদস্যকে দিতে হবে।
- মেস ফান্ড = মোট জমা − মোট খরচ।
- “কে বাজার/খরচ করেছেন” শুধু **রেকর্ড ও রিপোর্টের জন্য**। এটি জমা হিসেবে ব্যালেন্সে যোগ হয় না। কেউ নিজের পকেট থেকে বাজার করলে সেটি **জমা** পেজে আলাদা জমা হিসেবে লিখুন।

---

## দ্রুত শুরু (ডেমো)

```bash
npm install
npm run dev
```

ব্রাউজারে খুলে **“ডেমো দেখুন”** চাপুন। ডেমো ডেটা শুধু ওই ব্রাউজারের `localStorage`-এ থাকে।

> Windows PowerShell-এ `npm` ব্লক থাকলে `npm.cmd` ব্যবহার করুন।

### Build

```bash
npm run build
npm run preview
```

---

## Cloud সেটআপ (Supabase)

### ১. প্রজেক্ট তৈরি

1. [supabase.com/dashboard](https://supabase.com/dashboard)-এ যান এবং ফ্রি অ্যাকাউন্ট খুলুন।
2. **New project** → নাম দিন, ডেটাবেস পাসওয়ার্ড দিন, কাছের region (যেমন Singapore) বেছে নিন।
3. প্রজেক্ট তৈরি হতে ১–২ মিনিট লাগবে।

### ২. SQL schema চালান

1. Supabase প্রজেক্টে **SQL Editor** খুলুন।
2. এই রিপোর [`supabase/schema.sql`](supabase/schema.sql) ফাইলের **পুরো** কনটেন্ট কপি করুন।
3. SQL Editor-এ paste করে **Run** করুন।

অ্যাপের প্রথম স্ক্রিন থেকেও SQL কপি/ডাউনলোড করা যায়। স্ক্রিপ্টটি টেবিল, RLS policy, RPC ফাংশন ও realtime publication তৈরি করে। এটি একবারই চালানো দরকার; আবার চালালেও সমস্যা হবে না।

> **আগে schema চালানো থাকলে** নতুন “কে বাজার/খরচ করেছেন” ও “ম্যানেজার বদলান” ফিচারের জন্য `supabase/schema.sql` আবার একবার Run করুন। পুরনো এন্ট্রিতে যিনি এন্ট্রি করেছিলেন তাঁকে ডিফল্ট হিসেবে ধরা হবে; নতুন ম্যানেজার-বদল ফাংশনও তৈরি হবে।

### ৩. URL ও anon key নিন

Supabase-এ **Project Settings → API** (নতুন UI-তে **API Keys**) থেকে কপি করুন:

- **Project URL** — যেমন `https://abcdefgh.supabase.co`
- **anon / public key** — `eyJhbGciOi...` দিয়ে শুরু হওয়া public key, অথবা নতুন প্রজেক্টের **publishable key** (`sb_publishable_...`)

> `service_role` বা **secret key** কখনো ব্রাউজারে দেবেন না। শুধু **anon public / publishable** key ব্যবহার করুন — RLS ডেটা সুরক্ষিত রাখে।

### ৪. Authentication ঠিক করুন

**Authentication → Sign In / Providers → Email**:

- দ্রুত শুরু করতে **Confirm email** বন্ধ রাখুন। তাহলে সাইন আপের পরই লগইন হয়ে যাবে।
- Confirm email চালু রাখলে সদস্যকে ইমেইলের লিংকে ক্লিক করতে হবে। তখন **Authentication → URL Configuration**-এ:
  - **Site URL** = আপনার ডিপ্লয় করা অ্যাপের URL
  - **Redirect URLs**-এ একই URL যোগ করুন

### ৫. অ্যাপে Cloud চালু করুন

**স্থানীয়ভাবে চালানোর সময়:** অ্যাপ খুলে প্রথম স্ক্রিনে Project URL ও anon key দিন → **কানেক্ট করুন**। তারপর নতুন অ্যাকাউন্ট খুলে মেস তৈরি করুন।

**সদস্যদের সাথে শেয়ার করার আগে (জরুরি):** হোস্টিং-এ `VITE_SUPABASE_URL` ও `VITE_SUPABASE_ANON_KEY` environment variable সেট করুন। নাহলে প্রতিটি সদস্যের ব্রাউজারে আবার Supabase সেটআপ স্ক্রিন আসবে। env সেট থাকলে সবাই সরাসরি লগইন/সাইনআপ স্ক্রিন দেখবে।

লোকাল টেস্টের জন্য `.env.example` কপি করে `.env` বানাতে পারেন:

```bash
cp .env.example .env
```

`.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## ডিপ্লয় (ফ্রি হোস্টিং)

### সবচেয়ে সহজ: Netlify Drop (GitHub ছাড়া)

যদি GitHub ব্যবহার করতে না চান, লোকাল কম্পিউটার থেকেই সাইটটি আপলোড করা যায়:

1. প্রজেক্ট ফোল্ডারে `.env.example` কপি করে `.env` বানান এবং Supabase URL/key বসান (উপরের ধাপ ৫)।
2. `npm.cmd run build` চালান — `dist` ফোল্ডার তৈরি হবে।
3. [app.netlify.com/drop](https://app.netlify.com/drop)-এ গিয়ে **`dist` ফোল্ডারটি** ড্র্যাগ করে ছেড়ে দিন।
4. কয়েক সেকেন্ডে লাইভ লিংক পাবেন। চাইলে সাইটের নাম বদলাতে পারবেন।

> এখানে URL/key বিল্ডের সময় ফাইলে বসে যায়। key বদলালে আবার `npm.cmd run build` করে নতুন `dist` আপলোড করুন। ভবিষ্যতে আপডেট করতে Netlify সাইটের **Deploys → Drag and drop** ব্যবহার করুন।

### Vercel (GitHub দিয়ে)

1. কোডটি GitHub-এ পুশ করুন।
2. [vercel.com](https://vercel.com) → **Add New → Project** → রিপো ইমপোর্ট করুন।
3. Framework: **Vite** (স্বয়ংক্রিয়ভাবে ধরা পড়বে)।
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Environment Variables**-এ যোগ করুন:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy** চাপুন।

`vercel.json`-এ SPA rewrite দেওয়া আছে, তাই `/meals`, `/summary`-এ সরাসরি গেলেও 404 হবে না।

### Netlify (GitHub দিয়ে অটো ডিপ্লয়)

1. [app.netlify.com](https://app.netlify.com) → **Add new project → Import an existing project** → **GitHub** → রিপো বেছে নিন।
2. `netlify.toml` থেকে build command (`npm run build`) ও publish directory (`dist`) নিজেই ধরা পড়বে।
3. **Project configuration → Environment variables**-এ দুটি env যোগ করুন:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** চাপুন। এরপর যেকোনো `git push` করলে Netlify নিজেই নতুন version লাইভ করে দেবে।
5. **Project configuration → General → Visitor access → Project visibility** → **Public** করে দিন, নাহলে সদস্যরা সাইট খুলতে পারবে না।

`public/_redirects` ও `netlify.toml` দুটোই SPA রুটিং সামলাবে, তাই `/meals`, `/summary`-এ সরাসরি গেলেও 404 হবে না।

### Cloudflare Pages

1. রিপো কানেক্ট করুন।
2. Framework preset: **Vite**, build command `npm run build`, output `dist`।
3. Environment variables-এ দুটি env যোগ করুন।

### ডিপ্লয়ের পর

- Supabase **Site URL** ও **Redirect URLs**-এ ডিপ্লয় করা ডোমেইন দিন (Confirm email চালু থাকলে আবশ্যক)।
- ম্যানেজার প্রথমে সাইন আপ করে মেস তৈরি করবেন।
- **সদস্য** পেজ থেকে ইনভাইট কোড/লিংক কপি করে সদস্যদের পাঠাবেন।
- সদস্যরা অ্যাপের লিংক খুলে **নতুন অ্যাকাউন্ট** → সাইন আপ → ইনভাইট কোড দিয়ে join করবে।

---

## Git + GitHub সেটআপ (push = live + অটো SQL)

একবার সেট করলে **`git push` করলেই** দুই কাজ হবে:

1. **Netlify** নতুন build লাইভ করবে।
2. **GitHub Actions** `supabase/schema.sql` চালিয়ে ডেটাবেস আপডেট করবে — SQL Editor-এ হাতে কিছু চালাতে হবে না।

### ১. লোকাল প্রজেক্ট Git-এ নিন

```powershell
cd "C:\Users\Saju-Ahmed\Documents\Default Project"
git init
git add .
git commit -m "Mess Khata: first commit"
```

> `.gitignore`-এ `.env` আর `node_modules`/`dist` বাদ দেওয়া আছে, তাই গোপন key কখনো Git-এ যাবে না।

### ২. GitHub-এ রিপো তৈরি করে push করুন

1. [github.com/new](https://github.com/new) → নাম দিন (যেমন `mess-khata`) → **Private** রাখতে পারেন → **Create repository**।
2. GitHub যে কমান্ডগুলো দেখাবে, সেগুলো চালান:

```powershell
git remote add origin https://github.com/<আপনার-ইউজারনেম>/mess-khata.git
git branch -M main
git push -u origin main
```

### ৩. Supabase DB connection string নিন (একবার)

Supabase Dashboard → **Project Settings → Database → Connection string → Session pooler** (অথবা URI) কপি করুন। দেখতে হবে এমন:

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> পাসওয়ার্ডে special character থাকলে URL-encode করুন। **Direct connection** নয় — IPv6 সমস্যার কারণে **Session pooler** ব্যবহার করুন।

### ৪. GitHub Secrets যোগ করুন

GitHub রিপো → **Settings → Secrets and variables → Actions → New repository secret**:

| নাম | মান |
|---|---|
| `SUPABASE_DB_URL` | উপরের পূর্ণ connection string |

এরপর `.github/workflows/supabase-schema.yml` নিজেই প্রতি push-এ schema apply করবে। প্রথমবার **Actions** ট্যাব থেকে **Run workflow** চেপে হাতে একবার চালিয়ে দেখতে পারেন।

### ৫. Netlify-তে GitHub কানেক্ট করুন

উপরের [Netlify (GitHub দিয়ে অটো ডিপ্লয়)](#netlify-github-দিয়ে-অটো-ডিপ্লয়) অংশ দেখুন, এবং env variable দুটি যোগ করুন।

### ৬. এরপর প্রতিদিনের কাজ

```powershell
# কোড বা SQL বদলানোর পর
git add .
git commit -m "বদলানোর বিবরণ"
git push
```

- UI/কোড বদলালে `dist` তৈরি করে Netlify নিজেই লাইভ করবে।
- `supabase/schema.sql` বদলালে GitHub Actions সেটি ডেটাবেসে apply করবে।
- schema ফাইলটি **idempotent** — পুরোটা আবার চালালেও পুরনো ডেটা মুছবে না, শুধু নতুন কলাম/টেবিল/ফাংশন যোগ হবে।

> ⚠️ schema-তে ভুল থাকলে Action fail করবে, কিন্তু সাইট লাইভ হয়ে যেতে পারে। তখন GitHub → **Actions** → লাল ✗ চিহ্নে ক্লিক করে error দেখে ঠিক করুন।

---

## ব্যবহারের ধরন

| কাজ | কে করতে পারবে |
|---|---|
| মিল, বাজার, জমা, অন্যান্য খরচ যোগ/এডিট/ডিলিট | মেসের সব সক্রিয় সদস্য |
| মেসের নাম/currency বদলানো | ম্যানেজার |
| ইনভাইট কোড রিজেনারেট | ম্যানেজার |
| সদস্য সরানো | ম্যানেজার |
| ম্যানেজার বদলানো | বর্তমান ম্যানেজার (সদস্য পেজ → ম্যানেজার বদলান) |
| মেস ছাড়া | সদস্য (ম্যানেজার নয়) |
| CSV/PDF/শেয়ার | সব সদস্য |

একটি অ্যাকাউন্ট একাধিক মেসে থাকতে পারে; **সেটিংস → অন্য মেস** থেকে বদলানো যায়।

---

## মোবাইলে ইনস্টল (PWA)

- **Android Chrome:** মেনু → **Add to Home screen / Install app**
- **iPhone Safari:** Share → **Add to Home Screen**
- **Desktop Chrome/Edge:** অ্যাড্রেস বারের install আইকন

ইনস্টল করলে অ্যাপ আলাদা উইন্ডোতে খোলে। প্রথমবার লোড হওয়ার পর অ্যাপ শেল ক্যাশ হয়ে যায়; ডেটার জন্য ইন্টারনেট লাগবে (Supabase)।

---

## ব্যাকআপ

- প্রতি মাস শেষে **সারসংক্ষেপ → CSV** ডাউনলোড করে রাখুন।
- **প্রিন্ট / PDF** দিয়ে মাসিক রিপোর্ট সেভ করুন।
- Supabase free plan-এ আলাদা automatic backup থাকে না। গুরুত্বপূর্ণ ডেটার জন্য Supabase Dashboard → Database → Backups দেখুন, অথবা `pg_dump` দিয়ে নিজে ব্যাকআপ নিন।

---

## সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| `Supabase-এ SQL schema পাওয়া যায়নি` / `42P01` | `supabase/schema.sql` পুরোটা SQL Editor-এ চালান |
| `Anon key-টি সঠিক নয়` / `401` | Project Settings → API থেকে public anon key আবার কপি করুন |
| `ইমেইলটি এখনো যাচাই হয়নি` | ইমেইলের লিংকে ক্লিক করুন, অথবা Supabase-এ Confirm email বন্ধ করুন |
| `ইনভাইট কোডটি সঠিক নয়` | ম্যানেজারের দেওয়া সর্বশেষ ৬ অক্ষরের কোড দিন |
| সদস্যদের লগইন স্ক্রিনের বদলে setup স্ক্রিন আসছে | হোস্টিং-এ `VITE_SUPABASE_URL` ও `VITE_SUPABASE_ANON_KEY` env সেট করে আবার deploy করুন |
| ডিপ্লয়ে সাবপেজে 404 | `vercel.json` / `public/_redirects` আছে কিনা দেখুন |
| রিয়েলটাইম আপডেট আসছে না | SQL schema-র শেষ অংশ (realtime publication) চালানো হয়েছে কিনা দেখুন; পেজ রিফ্রেশ করলেও ঠিক হবে |
| পাসওয়ার্ড ভুলে গেছেন | Supabase Dashboard → Authentication → Users → user → **Reset password** |
| কিছুদিন ব্যবহার না করলে অ্যাপ থেমে যায় | Supabase free প্রজেক্ট নিষ্ক্রিয় থাকলে pause হতে পারে। Dashboard → প্রজেক্ট → **Restore project** চাপুন। |
| সদস্যকে সরানো হয়েছে কিন্তু তার পুরনো এন্ট্রি আছে | এটাই প্রত্যাশিত — পুরনো হিসাব সংরক্ষিত থাকে |

---

## প্রজেক্ট স্ট্রাকচার

```
src/
  components/
    AppShell.tsx      # সাইডবার, মোবাইল নেভিগেশন, লেআউট
    ui.tsx            # Button, Input, Modal, StatCard ইত্যাদি
  context/
    AppContext.tsx    # auth, mode, data loading, সব mutation
  lib/
    api.ts            # common Api interface
    cloudApi.ts       # Supabase implementation
    demoApi.ts        # localStorage demo + seed data
    calc.ts           # মিল রেট/বিল/ব্যালেন্স হিসাব
    format.ts         # বাংলা তারিখ/মাস/টাকা ফরম্যাট
    export.ts         # CSV ও শেয়ার টেক্সট
    supabase.ts       # client + connection test
    config.ts         # env/localStorage config
  pages/              # Dashboard, Meals, Bazar, Deposits,
                      # OtherCosts, Members, Summary, Settings,
                      # Welcome, Auth, Onboarding
supabase/
  schema.sql          # সম্পূর্ণ ডেটাবেস schema + RLS + RPC
public/
  favicon.svg, icon-192.png, icon-512.png, _redirects
vercel.json           # SPA rewrite + cache headers
```

---

## টেক স্ট্যাক

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres, Auth, Realtime, RLS)
- React Router 7
- lucide-react আইকন, date-fns, sonner টোস্ট
- vite-plugin-pwa

---

## দায়স্বীকার

এই অ্যাপটি ব্যক্তিগত মেসের হিসাবের জন্য বানানো। এটি কোনো আর্থিক প্রতিষ্ঠান বা অডিট সফটওয়্যার নয়। গুরুত্বপূর্ণ লেনদেনের ক্ষেত্রে নিজে যাচাই করে নিন এবং নিয়মিত ব্যাকআপ রাখুন।

**মেস খাতা · v1.0.0**
