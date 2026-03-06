# 🇳🇵 Nepal Election 2082 — Live Results Dashboard

A production-grade live election results dashboard for Nepal's Pratinidhi Sabha Election 2082.

## Features
- **Live data** fetched server-side from `result.election.gov.np` via proxy API (no CORS issues)
- **RSS news feed** from Kantipur, Setopati, OnlineKhabar, Nepal TV, Ratopati, Republica
- **Party standings** with real logos from 2082.live (ECN-sourced)
- **Candidate profiles** with actual photos from 2082.live
- **Bilingual** English / नेपाली toggle
- **Auto-refresh** every 30 seconds
- Deployable on Vercel in 2 minutes

---

## 🚀 Deploy to Vercel (2 minutes)

### Option A — Vercel CLI (Fastest)
```bash
# 1. Install dependencies
npm install

# 2. Install Vercel CLI
npm i -g vercel

# 3. Deploy
vercel

# Follow prompts: select your account, project name = "nepal-election-2082"
# Done! You'll get a URL like: https://nepal-election-2082.vercel.app
```

### Option B — GitHub + Vercel Dashboard
1. Push this folder to a GitHub repo:
```bash
git init
git add .
git commit -m "Nepal Election 2082 dashboard"
git remote add origin https://github.com/YOUR_USERNAME/nepal-election-2082.git
git push -u origin main
```
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import your GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — done in ~60 seconds

---

## 🖥 Run Locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📡 How Live Data Works

### `/api/results` (Server-side proxy)
- Runs on Vercel's serverless functions — no browser CORS restrictions
- Fetches `nepalvotes.live` (which mirrors ECN every 30s) server-side
- Parses `__NEXT_DATA__` JSON from the page
- Falls back to `result.election.gov.np` directly
- Falls back to structured empty response if both fail
- Response cached for 30 seconds on Vercel's edge network

### `/api/news` (RSS aggregator)
- Fetches RSS feeds from 7 Nepali news sources in parallel
- Parses XML with regex (edge-compatible, no DOM)
- Filters election-relevant articles
- Cached for 2 minutes

---

## 📁 Project Structure
```
nepal-election-2082/
├── pages/
│   ├── index.js          # Main dashboard UI
│   ├── _document.js      # HTML document
│   └── api/
│       ├── results.js    # Live results proxy → ECN
│       └── news.js       # RSS news aggregator
├── lib/
│   └── parties.js        # Party + candidate data
├── next.config.js
├── vercel.json
└── package.json
```

---

## 🛡 Data Sources
| Source | What | URL |
|--------|------|-----|
| Election Commission Nepal | Official FPTP results | result.election.gov.np |
| nepalvotes.live | ECN mirror (30s) | nepalvotes.live |
| 2082.live | Candidate photos, party logos | 2082.live |
| Kantipur | News RSS | kantipurdaily.com |
| Setopati | News RSS | setopati.com |
| OnlineKhabar | News RSS | onlinekhabar.com |
| Ratopati | News RSS | ratopati.com |
| Republica | News RSS | myrepublica.nagariknetwork.com |

---

## ⚡ Why Server-Side Proxy?
Browsers block cross-origin requests (CORS). ECN and other Nepali sites don't allow `Access-Control-Allow-Origin: *`.
By running fetch calls in Next.js API routes (Vercel serverless functions), we bypass CORS entirely since server-to-server requests have no restrictions.

## 📝 Notes
- ECN portal is JS-rendered (Next.js SPA). If `__NEXT_DATA__` parsing fails, the dashboard gracefully shows the 2079 baseline data and direct links.
- Counting data will appear progressively as ECN enters results for each constituency.
