/**
 * POST /api/check/[id] — Core "Check Now" engine.
 *
 * Pipeline:
 * 1. Fetch the URL with a Chrome-like User-Agent
 * 2. Parse with @mozilla/readability + jsdom to extract clean text
 * 3. Compute SHA-256 hash of the cleaned text
 * 4. Compare hash against the most recent successful check
 * 5. If unchanged: insert 'no_change' record, return early
 * 6. If changed: compute word-level diff, call Gemini for summary
 * 7. If Gemini fails: still save content, set diff_summary to null
 * 8. Insert 'success' record and return diff + summary
 */

import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { createHash } from "crypto";
import { diffWords } from "diff";
import { supabase } from "@/lib/supabase";
import { summarizeChanges } from "@/lib/gemini";
import type { CheckResult, DiffChange, ApiError, LinkCheck } from "@/lib/types";

// Force Node.js runtime for jsdom compatibility and disable static caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chrome-like User-Agent to reduce bot-blocking by target sites */
const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Extract clean readable text from raw HTML using Readability.
 * Falls back to basic DOM text extraction if Readability fails or
 * returns too little content (e.g. minimal pages like example.com).
 */
function extractReadableText(html: string, url: string): string {
    let readabilityText = "";

    // Try Readability first (best for article-style pages)
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article && article.textContent) {
            readabilityText = article.textContent.replace(/\n{3,}/g, "\n\n").trim();
        }
    } catch (error) {
        console.warn("[extractReadableText] Readability failed:", error);
    }

    // If Readability got a good result (>50 chars), use it
    if (readabilityText.length > 50) {
        return readabilityText;
    }

    // Fallback: extract raw text from the full DOM body
    // This handles minimal pages (example.com) and pages Readability can't parse
    try {
        const dom = new JSDOM(html, { url });
        const body = dom.window.document.body;
        if (body) {
            // Remove script and style elements before extracting text
            const scripts = body.querySelectorAll("script, style, noscript");
            scripts.forEach((el) => el.remove());
            const text = body.textContent || "";
            const cleaned = text.replace(/\s+/g, " ").trim();
            if (cleaned.length > 0) {
                return cleaned;
            }
        }
    } catch {
        // Last resort: regex strip
    }

    // Final fallback: strip HTML tags with regex
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Compute SHA-256 hash of a string */
function computeHash(content: string): string {
    return createHash("sha256").update(content, "utf-8").digest("hex");
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CheckResult | ApiError>> {
    try {
        const { id } = await params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
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

        // ─── Step 1: Fetch the URL ───────────────────────────────────────────
        let html: string;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(link.url, {
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                redirect: "follow",
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            html = await response.text();
        } catch (fetchError) {
            // Save error record to the database with a descriptive message
            let errorMessage = "Unknown fetch error";
            if (fetchError instanceof Error) {
                if (fetchError.name === "AbortError") {
                    errorMessage = "Request timed out after 20 seconds";
                } else {
                    errorMessage = fetchError.message || fetchError.name;
                }
            }
            console.error(`[POST /api/check/${id}] Fetch failed for ${link.url}:`, fetchError);

            const { data: errorCheck } = await supabase
                .from("link_checks")
                .insert({
                    link_id: id,
                    status: "error",
                    error_message: errorMessage,
                })
                .select()
                .single();

            return NextResponse.json({
                status: "error",
                check: errorCheck as LinkCheck,
                diff: null,
            });
        }

        // ─── Step 2: Extract clean readable text ─────────────────────────────
        const cleanText = extractReadableText(html, link.url);

        if (!cleanText || cleanText.length < 10) {
            const { data: errorCheck } = await supabase
                .from("link_checks")
                .insert({
                    link_id: id,
                    status: "error",
                    error_message: "Could not extract readable content from the page",
                })
                .select()
                .single();

            return NextResponse.json({
                status: "error",
                check: errorCheck as LinkCheck,
                diff: null,
            });
        }

        // ─── Step 3: Compute SHA-256 hash ────────────────────────────────────
        const contentHash = computeHash(cleanText);

        // ─── Step 4: Get the most recent successful check ────────────────────
        const { data: lastChecks } = await supabase
            .from("link_checks")
            .select("*")
            .eq("link_id", id)
            .in("status", ["success", "no_change"])
            .order("fetched_at", { ascending: false })
            .limit(1);

        const lastCheck = lastChecks && lastChecks.length > 0 ? lastChecks[0] : null;

        // ─── Step 5: If hash matches → no change ────────────────────────────
        if (lastCheck && lastCheck.content_hash === contentHash) {
            const { data: noChangeCheck } = await supabase
                .from("link_checks")
                .insert({
                    link_id: id,
                    status: "no_change",
                    raw_content: cleanText,
                    content_hash: contentHash,
                })
                .select()
                .single();

            return NextResponse.json({
                status: "no_change",
                check: noChangeCheck as LinkCheck,
                diff: null,
            });
        }

        // ─── Step 6: Content changed — compute word-level diff ───────────────
        const previousContent = lastCheck?.raw_content || "";
        const diffResult = diffWords(previousContent, cleanText);
        const diffChanges: DiffChange[] = diffResult.map((part) => ({
            value: part.value,
            added: part.added || undefined,
            removed: part.removed || undefined,
        }));

        // ─── Step 7: Call Gemini for summary ─────────────────────────────────
        // If Gemini fails, we still save the content (Step 8 requirement)
        const diffSummary = await summarizeChanges(previousContent, cleanText);

        // ─── Step 9: Insert success record ───────────────────────────────────
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

        // ─── Step 10: Return diff, summary, and citations ────────────────────
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
