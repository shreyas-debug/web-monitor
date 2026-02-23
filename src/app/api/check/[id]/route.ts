/**
 * POST /api/check/[id] — Core "Check Now" engine.
 *
 * Pipeline:
 * 1. Fetch the URL with a Chrome-like User-Agent
 * 2. Extract clean, readable text via content-extractor
 * 3. Compute SHA-256 hash of the cleaned text
 * 4. Compare hash against the most recent successful check
 * 5. If unchanged: insert 'no_change' record, return early
 * 6. If changed: compute word-level diff, call Gemini for summary
 * 7. If Gemini fails: still save content, set diff_summary to null
 * 8. Insert 'success' record and return diff + summary
 */

import { NextRequest, NextResponse } from "next/server";
import { diffWords } from "diff";
import { supabase } from "@/lib/supabase";
import { summarizeChanges } from "@/lib/gemini";
import { extractReadableText, computeContentHash } from "@/lib/content-extractor";
import type { CheckResult, DiffChange, ApiError, LinkCheck } from "@/lib/types";

// Force Node.js runtime for jsdom compatibility and disable static caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chrome-like User-Agent to reduce bot-blocking by target sites */
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** UUID format regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fetch the raw HTML from a URL with a timeout. Throws on network or HTTP error. */
async function fetchPageHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            redirect: "follow",
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

/** Insert an error check record and return the formatted response. */
async function buildErrorResponse(
    linkId: string,
    errorMessage: string
): Promise<NextResponse<CheckResult | ApiError>> {
    const { data: errorCheck } = await supabase
        .from("link_checks")
        .insert({ link_id: linkId, status: "error", error_message: errorMessage })
        .select()
        .single();

    return NextResponse.json({
        status: "error",
        check: errorCheck as LinkCheck,
        diff: null,
    });
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ message: string; id: string }>> {
    const { id } = await params;
    return NextResponse.json({ message: "Check route reachable", id }, { status: 200 });
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CheckResult | ApiError>> {
    try {
        const { id } = await params;

        if (!UUID_REGEX.test(id)) {
            return NextResponse.json({ error: "Invalid link ID format" }, { status: 400 });
        }

        // Verify the link exists
        const { data: link, error: linkError } = await supabase
            .from("monitored_links")
            .select("*")
            .eq("id", id)
            .single();

        if (linkError || !link) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        // ─── Step 1: Fetch the URL ─────────────────────────────────────────────
        let html: string;
        try {
            html = await fetchPageHtml(link.url);
        } catch (fetchError) {
            const message =
                fetchError instanceof Error
                    ? fetchError.name === "AbortError"
                        ? "Request timed out after 20 seconds"
                        : fetchError.message || fetchError.name
                    : "Unknown fetch error";
            console.error(`[POST /api/check/${id}] Fetch failed for ${link.url}:`, fetchError);
            return buildErrorResponse(id, message);
        }

        // ─── Step 2: Extract clean readable text ──────────────────────────────
        const cleanText = extractReadableText(html, link.url);
        if (!cleanText || cleanText.length < 10) {
            return buildErrorResponse(id, "Could not extract readable content from the page");
        }

        // ─── Step 3: Compute SHA-256 hash ─────────────────────────────────────
        const contentHash = computeContentHash(cleanText);

        // ─── Step 4: Get the most recent successful check ─────────────────────
        const { data: lastChecks } = await supabase
            .from("link_checks")
            .select("*")
            .eq("link_id", id)
            .in("status", ["success", "no_change"])
            .order("fetched_at", { ascending: false })
            .limit(1);

        const lastCheck = lastChecks && lastChecks.length > 0 ? lastChecks[0] : null;

        // ─── Step 5: If hash matches → no change ──────────────────────────────
        if (lastCheck && lastCheck.content_hash === contentHash) {
            const { data: noChangeCheck } = await supabase
                .from("link_checks")
                .insert({ link_id: id, status: "no_change", raw_content: cleanText, content_hash: contentHash })
                .select()
                .single();

            return NextResponse.json({
                status: "no_change",
                check: noChangeCheck as LinkCheck,
                diff: null,
            });
        }

        // ─── Step 6: Content changed — compute word-level diff ────────────────
        const previousContent = lastCheck?.raw_content || "";
        const diffResult = diffWords(previousContent, cleanText);
        const diffChanges: DiffChange[] = diffResult.map((part) => ({
            value: part.value,
            added: part.added || undefined,
            removed: part.removed || undefined,
        }));

        // ─── Step 7: Call Gemini with diff-only context ───────────────────────
        // Extract only the changed words to reduce token usage significantly
        const addedText = diffResult
            .filter((p) => p.added)
            .map((p) => p.value)
            .join(" ")
            .slice(0, 1500);
        const removedText = diffResult
            .filter((p) => p.removed)
            .map((p) => p.value)
            .join(" ")
            .slice(0, 1500);

        const diffSummary = await summarizeChanges(removedText, addedText);

        // ─── Step 8: Insert success record ────────────────────────────────────
        const { data: successCheck, error: insertError } = await supabase
            .from("link_checks")
            .insert({
                link_id: id,
                status: "success",
                raw_content: cleanText,
                content_hash: contentHash,
                diff_summary: diffSummary,
            })
            .select()
            .single();

        if (insertError) {
            console.error("[POST /api/check/[id]] Insert error:", insertError);
            return NextResponse.json({ error: "Failed to save check result" }, { status: 500 });
        }

        return NextResponse.json({
            status: "success",
            check: successCheck as LinkCheck,
            diff: diffChanges,
        });
    } catch (error) {
        console.error("[POST /api/check/[id]] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
