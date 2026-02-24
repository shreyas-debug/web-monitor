# AI Usage Notes

Honest documentation of how AI was used during development of this project.

## What AI was used for

- **Project scaffolding**: AI assisted with initial project setup suggestions, file structure organization, and boilerplate generation (Next.js config, shadcn/ui initialization).
- **Component structure**: AI helped generate the base structure for React components (StatusBadge, DiffView, LinkCard, AddLinkForm) based on detailed specifications.
- **Prompt design**: The Gemini prompt for summarizing webpage changes was drafted with AI assistance, including the structured output schema design.
- **Documentation**: README structure, API route documentation comments, and this file were drafted with AI assistance.

## What was manually written/reviewed

- **Database schema design**: The table structure, constraints (CHECK, UNIQUE, CASCADE), and indexing strategy in `supabase/schema.sql` were designed based on the requirements and reviewed for correctness.
- **Business logic**: The core "Check Now" pipeline (fetch → readability → hash → diff → Gemini → save) was architected to handle key edge cases: network failures, unreadable pages, Gemini API outages, hash-based deduplication.
- **Error handling**: Every API route has comprehensive try/catch with meaningful error messages. The design decision to never let LLM failures block content saving was carefully considered.
- **Initial Baseline logic**: The system was explicitly designed to handle "first-time checks" differently from subsequent checks. Instead of running a confusing empty diff, it requests a 2-sentence page overview from Gemini to establish a baseline snapshot.
- **Timeout Mitigation**: To prevent Vercel's strict 10s Serverless execution limit from killing the Edge function, the payload sent to Gemini during the massive initial baseline extraction is strictly capped to 3000 characters, maintaining UX speed while still generating a high-quality summary.
- **Environment variable validation**: The centralized `lib/env.ts` pattern was chosen to fail fast with descriptive errors rather than cryptic runtime crashes.
- **Security**: Ensured Supabase service role key and Gemini API key are never exposed client-side. All sensitive operations happen in API routes only.

## Bugs AI introduced that were caught and fixed

- **Type safety**: AI-generated code sometimes used `any` types or loose type assertions. These were tightened to use proper TypeScript interfaces defined in `lib/types.ts`.
- **Error handling gaps**: Initial API route implementations had missing error branches (e.g., what happens when Readability returns null, when fetch times out, when Supabase insert fails). These were added during review.
- **Readability fallback**: The initial content extraction had no fallback for when @mozilla/readability fails to parse a page. A basic text extraction fallback was added.


**All AI-generated code was reviewed, tested, and modified before being merged into the final implementation.**