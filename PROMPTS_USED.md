# Prompts Used During Development

Log of significant prompts used during the development of this project. This log focuses on the primary prompts used for AI-powered generation and summarization; routine debugging and refactoring prompts are intentionally omitted.

## 1. Project Architecture & Scaffolding

**Tool**: Antigravity (AI Coding Assistant)
**Prompt summary**: Shared the full challenge specification and requested an initial project scaffold aligned with the required tech stack and file structure.
**What it produced**: An initial Next.js 15 project structure with dependencies and folder layout, which I reviewed and adapted during implementation.

## 2. Core Library Files

**Tool**: Antigravity
**Prompt summary**: Requested initial implementations for core library utilities (env validation, Supabase client, Gemini client, shared types) based on the project architecture.
**What it produced**: Draft implementations of the core library files, which were manually reviewed, adjusted, and integrated into the final codebase.

## 3. API Route Implementation

**Tool**: Antigravity
**Prompt summary**: Requested a starting point for API route implementations based on the defined pipeline and validation rules.
**What it produced**: Initial versions of the API routes outlining request flow and structure, which were iteratively refined, tested, and corrected during development.

## 4. Gemini Prompt (In-App)

**Tool**: Google Gemini API (called at runtime)
**Prompt**: "You are analyzing changes to a webpage. Below is the PREVIOUS version and the NEW version of the page content. Summarize what changed in 2-3 sentences. Then list up to 5 exact quotes from the NEW content that best illustrate the changes."
**Schema**: `{ summary: string, citations: string[] }` via responseSchema
**Runtime Behaviour**: Structured JSON with a natural-language summary and cited snippets from the changed content.

## 5. Frontend Components

**Tool**: Antigravity
**Prompt summary**: Requested initial implementations for key UI components based on the intended UX and data flow.
**What it produced**: Base versions of the components, which were then customized, styled, and adjusted to handle loading, error, and baseline states correctly.

## 6. Documentation

**Tool**: Antigravity
**Prompt summary**: Generate README.md, AI_NOTES.md, ABOUTME.md, and this file following the exact format specified in the challenge.
**What it produced**: Initial drafts of the documentation files, which were reviewed, corrected, and updated to accurately reflect the final implementation.