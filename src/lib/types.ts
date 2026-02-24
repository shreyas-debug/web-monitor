/**
 * Shared TypeScript interfaces for the Web Monitor application.
 * These types mirror the database schema and define API request/response shapes.
 */

// ─── Database Models ─────────────────────────────────────────────────────────

/** Represents a URL being monitored — maps to `monitored_links` table */
export interface MonitoredLink {
    id: string;
    url: string;
    title: string | null;
    project_name: string;
    created_at: string;
}

/** Represents a single check of a monitored link — maps to `link_checks` table */
export interface LinkCheck {
    id: string;
    link_id: string;
    fetched_at: string;
    status: "success" | "no_change" | "error" | "initial_baseline";
    raw_content: string | null;
    content_hash: string | null;
    diff_summary: DiffSummary | null;
    error_message: string | null;
}

/** Structured output from the Gemini LLM summarizing page changes */
export interface DiffSummary {
    summary: string;
    citations: string[];
}

// ─── API Response Types ──────────────────────────────────────────────────────

/** A monitored link joined with its most recent check (used in the link list) */
export interface LinkWithLatestCheck extends MonitoredLink {
    latest_check: LinkCheck | null;
}

/** Response from the GET /api/status endpoint */
export interface StatusResponse {
    backend: "ok";
    database: "ok" | "error";
    llm: "ok" | "error";
    timestamp: string;
}

/** Response from POST /api/check/[id] when content has changed */
export interface CheckResult {
    status: "success" | "no_change" | "error" | "initial_baseline";
    check: LinkCheck;
    diff: DiffChange[] | null;
}

/** A single diff change segment (mirrors the `diff` package output) */
export interface DiffChange {
    value: string;
    added?: boolean;
    removed?: boolean;
}

// ─── API Request Types ───────────────────────────────────────────────────────

/** Request body for POST /api/links */
export interface AddLinkRequest {
    url: string;
    project_name?: string;
}

/** Generic API error response */
export interface ApiError {
    error: string;
}
