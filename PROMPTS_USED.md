# Prompts Used During Development

Log of significant prompts used during the development of this project.

## 1. Project Architecture & Scaffolding

**Tool**: Antigravity (AI Coding Assistant)
**Prompt summary**: Provided the complete challenge specification including tech stack, database schema, API routes, frontend requirements, documentation requirements, and build order. Asked the AI to scaffold the project following the exact sequence.
**What it produced**: Full project structure with Next.js 15, all npm dependencies, shadcn/ui initialization, and file organization.

## 2. Core Library Files

**Tool**: Antigravity
**Prompt summary**: Generate centralized environment variable validation (`lib/env.ts`), server-side Supabase client (`lib/supabase.ts`), Gemini AI client with structured output (`lib/gemini.ts`), and TypeScript interfaces (`lib/types.ts`).
**What it produced**: All four library files with proper typing, error handling, and documentation comments.

## 3. API Route Implementation

**Tool**: Antigravity
**Prompt summary**: Build all API routes following the specification: health check, CRUD for links (with validation), and the core "Check Now" engine with the 10-step pipeline.
**What it produced**: Five API route files with comprehensive error handling, UUID validation, and the full fetch→readability→hash→diff→Gemini pipeline.

## 4. Gemini Prompt (In-App)

**Tool**: Google Gemini API (called at runtime)
**Prompt**: "You are analyzing changes to a webpage. Below is the PREVIOUS version and the NEW version of the page content. Summarize what changed in 2-3 sentences. Then list up to 5 exact quotes from the NEW content that best illustrate the changes."
**Schema**: `{ summary: string, citations: string[] }` via responseSchema
**What it produces**: Structured JSON with a natural-language summary and cited snippets from the changed content.

## 5. Frontend Components

**Tool**: Antigravity
**Prompt summary**: Build four React components: StatusBadge (color-coded), DiffView (word-level diff with AI summary), LinkCard (full card with check/history/delete), AddLinkForm (URL validation).
**What it produced**: All four components with proper TypeScript typing, loading states, error states, and inline styling using Tailwind CSS.

## 6. Documentation

**Tool**: Antigravity
**Prompt summary**: Generate README.md, AI_NOTES.md, ABOUTME.md, and this file following the exact format specified in the challenge.
**What it produced**: All four documentation files, reviewed and edited for accuracy.
