# Web Monitor + Summary

A lightweight webpage change monitor with AI-powered summaries. Built as a coding challenge submission for Aggroso.

## What it does

Add any webpage URL (pricing pages, documentation, policy pages, etc.) and monitor it for content changes. When you click "Check Now," the app:

1. Fetches the page and extracts clean readable text using Mozilla Readability
2. Compares it against the previous version using SHA-256 hashing
3. If changed: computes a word-level diff and generates an AI summary using Google Gemini
4. Stores the result so you can view history of the last 5 checks

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Create the Supabase tables using the SQL in `supabase/schema.sql`
4. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

5. Open http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Dashboard → Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret, bypasses RLS) |
| `GEMINI_API_KEY` | Google Gemini API key (from Google AI Studio) |

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash
- **Content Extraction**: @mozilla/readability + jsdom
- **Diff Engine**: `diff` npm package (word-level diffs)
- **Deployment**: Vercel

## What is done

- [x] Add up to 8 URLs to monitor (with validation and duplicate detection)
- [x] Auto-scrape page title on link addition
- [x] "Check Now" fetches content, extracts readable text, computes diff
- [x] AI-generated summary of changes with cited snippets (Gemini 2.0 Flash)
- [x] Word-level diff view with green (added) / red (removed) highlighting
- [x] Check history (last 5 checks per URL)
- [x] Health status page (`/status`) with auto-refresh every 30 seconds
- [x] 30-second cooldown on "Check Now" to prevent API abuse
- [x] Full error handling on all API routes
- [x] Environment variable validation on startup

## What is not done / known limitations

- **No authentication**: Any user can access the app. Out of scope for this challenge.
- **Some sites block scraping**: Sites with aggressive bot protection (Cloudflare, etc.) may return errors or CAPTCHAs.
- **Content size limits**: Very large pages may be truncated when sent to Gemini (8000 char limit per version).
- **No real-time updates**: Polling-based; no WebSocket/SSE for live change notifications.
- **No scheduled checks**: Users must manually click "Check Now"; no cron-based automatic monitoring.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── check/[id]/          # POST: run check, GET history
│   │   ├── links/               # GET: list, POST: add
│   │   ├── links/[id]/          # DELETE: remove
│   │   └── status/              # GET: health check
│   ├── status/                  # Status page
│   ├── layout.tsx               # Root layout with nav
│   └── page.tsx                 # Home page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── AddLinkForm.tsx
│   ├── DiffView.tsx
│   ├── LinkCard.tsx
│   └── StatusBadge.tsx
└── lib/
    ├── env.ts                   # Env var validation
    ├── gemini.ts                # Gemini AI client
    ├── supabase.ts              # Server-side Supabase client
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # shadcn utilities
```
