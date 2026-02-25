# Web Monitor + AI Summary

**Live Demo**: [https://web-monitor-two.vercel.app/](https://web-monitor-two.vercel.app/)

A lightweight, production-ready webpage change monitor with AI-powered summaries.

## What it does

Add any webpage URL (pricing pages, documentation, policy pages, etc.) and monitor it for content changes. When you click "Check Now," the app:

1. **Fetches** the page with strict timeouts to stay within Vercel execution limits.
2. **Extracts** clean, readable text using `cheerio`, stripping CSS, scripts, and hidden elements to reduce noise and prompt injection risk.
3. **Hashes** the content using the Web Crypto API (`crypto.subtle.digest`) to instantly detect if a full diff is necessary.
4. **Diffs** the old and new text at the word level if changes are detected.
5. **Summarizes** detected changes using **Google Gemini 2.5 Flash**, including short explanations and quoted snippets.
6. **Stores** the result in Supabase so you can view the history of the last 5 checks.

**Note:** The very first check creates an **initial baseline snapshot**. This stores a short AI-generated overview of the page. Diffs and change summaries are generated only from the second check onward.

## Tech Stack & Architecture

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Runtime**: Vercel Edge Runtime (`/api/check`) & Node.js Serverless (`/api/links`)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.5 Flash
- **Content Extraction**: `cheerio` (Fast, lightweight, Edge-compatible)
- **Rate Limiting**: Upstash Redis (Sliding window IP-based rate limiting)
- **Validation**: Zod
- **Diff Engine**: `diff` npm package (word-level diffs)
- **Deployment**: Vercel

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
| `UPSTASH_REDIS_REST_URL` | Upstash Redis connection URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

## Production Hardening Features

This application includes several enterprise-grade security and performance enhancements:
- **Rate Limiting:** Global middleware intercepts traffic and limits IP addresses to 5 checks per minute via Upstash Redis.
- **Vercel Edge Computing:** The core scraping and AI route (`/api/check`) runs on the Vercel Edge Runtime, eliminating Node.js cold starts.
- **Graceful Failures:** Enforces strict 8-second HTTP fetch timeouts to gracefully fail before Vercel's hard 10-second Serverless limit.
- **Indirect Prompt Injection Defense:** Aggressively strips hidden DOM elements (`<noscript>`, `<style>`) and isolates untrusted user data in the Gemini prompt.
- **Global Security Headers:** Middleware attaches strict CSP, Permission, and Referrer policies.

## Features Completed

- Add up to 8 URLs to monitor (with validation and duplicate detection)
- Auto-scrape page title on link addition
- "Check Now" fetches content, extracts readable text, computes diff
- AI-generated summary of changes with cited snippets (Gemini 2.5 Flash)
- Word-level diff view with green (added) / red (removed) highlighting
- Check history (last 5 checks per URL)
- 30-second cooldown on "Check Now" to prevent scraping abuse
- Full error handling on all API routes
- Health status page (`/status`) with auto-refresh every 30 seconds
- Environment variable validation on startup

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── check/[id]/          # POST: run check, GET history (Edge Runtime)
│   │   ├── links/               # GET: list, POST: add (Serverless)
│   │   ├── links/[id]/          # DELETE: remove
│   │   └── status/              # GET: health check
│   ├── status/                  # Status page
│   ├── layout.tsx               # Root layout with nav
│   └── page.tsx                 # Home page (uses useLinks hook)
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── AddLinkForm.tsx          # Zod-validated URL form
│   ├── DiffView.tsx             # Word-level highlighted difference view
│   ├── LinkCard.tsx             # Item displaying status and check actions
│   └── StatusBadge.tsx
├── hooks/
│   └── useLinks.ts              # Data fetching hook for the dashboard
├── lib/
│   ├── controllers/             # Separated business logic
│   ├── errors/                  # Custom AppError and centralized handling
│   ├── schemas/                 # Zod validation schemas
│   ├── content-extractor.ts     # Cheerio extraction and Edge hashing
│   ├── gemini.ts                # AI client with prompt injection defense
│   ├── url-utils.ts             # Custom normalization without ESM bloat
│   ├── constants.ts             # Magic values (timeouts, models, limits)
│   ├── env.ts                   # Env var validation
│   ├── supabase.ts              # Server-side DB client
│   └── types.ts                 # TypeScript interfaces
└── middleware.ts                # Security Headers & Upstash Rate Limiting
```

## What is not done / known limitations

- **No authentication**: Any user can access the app. Out of scope for this challenge.
- **Some sites block scraping**: Sites with aggressive bot protection (Cloudflare, etc.) may return errors or CAPTCHAs.
- **Content size limits**: Very large pages may be truncated before being sent to Gemini to reduce hallucination risk and execution time.
- **No real-time updates**: Polling-based; no WebSocket/SSE for live change notifications.
- **No scheduled checks**: Users must manually click "Check Now"; no cron-based automatic monitoring.
