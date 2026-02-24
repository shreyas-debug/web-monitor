/**
 * check.controller.ts — Business logic for the "Check Now" feature.
 *
 * Orchestrates the full check pipeline:
 * fetch → extract → hash → diff → summarize → save
 *
 * Designed to be called from the thin route handler.
 * Throws AppError for known failures; route catches and converts to NextResponse.
 */

import { NextResponse } from "next/server";
import { diffWords } from "diff";
import { supabase } from "@/lib/supabase";
import { summarizeChanges, summarizeInitialPage } from "@/lib/gemini";
import { extractReadableText, computeContentHash } from "@/lib/content-extractor";
import { AppError, handleError } from "@/lib/errors";
import {
    USER_AGENT,
    UUID_REGEX,
    FETCH_TIMEOUT_MS,
    DIFF_TEXT_MAX_CHARS,
} from "@/lib/constants";
import type { CheckResult, DiffChange, LinkCheck } from "@/lib/types";

/**
 * Fetch the raw HTML of a URL with a timeout.
 * Throws a descriptive AppError if the fetch fails or times out.
 */
async function fetchPageHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
            throw new AppError(`HTTP ${response.status}: ${response.statusText}`, 502);
        }
        return await response.text();
    } catch (err) {
        if (err instanceof AppError) throw err;
        const isTimeout = err instanceof Error && err.name === "AbortError";
        throw new AppError(
            isTimeout ? `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s` : String(err),
            502
        );
    } finally {
        clearTimeout(timeout);
    }
}

/** Persist an error check record to the database and return the formatted response. */
async function saveErrorCheck(linkId: string, errorMessage: string): Promise<NextResponse<CheckResult>> {
    const { data: errorCheck } = await supabase
        .from("link_checks")
        .insert({ link_id: linkId, status: "error", error_message: errorMessage })
        .select()
        .single();

    return NextResponse.json({ status: "error", check: errorCheck as LinkCheck, diff: null });
}

/**
 * Run the full check pipeline for a monitored link.
 *
 * @param id - UUID of the monitored link
 * @returns NextResponse with check result, diff, and AI summary
 */
export async function runCheck(id: string): Promise<NextResponse> {
    try {
        if (!UUID_REGEX.test(id)) {
            throw new AppError("Invalid link ID format", 400);
        }

        const { data: link, error: linkError } = await supabase
            .from("monitored_links")
            .select("*")
            .eq("id", id)
            .single();

        if (linkError || !link) {
            throw new AppError("Link not found", 404);
        }

        // Step 1: Fetch HTML
        let html: string;
        try {
            html = await fetchPageHtml(link.url);
        } catch (fetchError) {
            const message = fetchError instanceof AppError
                ? fetchError.message
                : fetchError instanceof Error
                    ? fetchError.message
                    : "Unknown fetch error";
            console.error(`[runCheck] Fetch failed for ${link.url}:`, fetchError);
            return await saveErrorCheck(id, message);
        }

        // Step 2: Extract readable text
        const cleanText = extractReadableText(html, link.url);
        if (!cleanText || cleanText.length < 10) {
            return await saveErrorCheck(id, "Could not extract readable content from the page");
        }

        // Step 3: Compute hash and compare
        const contentHash = await computeContentHash(cleanText);

        const { data: lastChecks } = await supabase
            .from("link_checks")
            .select("*")
            .eq("link_id", id)
            .in("status", ["success", "no_change", "initial_baseline"])
            .order("fetched_at", { ascending: false })
            .limit(1);

        const lastCheck = lastChecks && lastChecks.length > 0 ? lastChecks[0] : null;

        // Step 4: First time check (Baseline) — store record and return early
        if (!lastCheck) {
            // Send truncated text to Gemini to get a 2-sentence page summary
            // Limit to 3000 chars to ensure the Edge function stays well under the 10s Vercel limit
            const initialSummary = await summarizeInitialPage(cleanText.slice(0, 3000));

            const { data: firstCheck, error: insertError } = await supabase
                .from("link_checks")
                .insert({
                    link_id: id,
                    status: "initial_baseline",
                    raw_content: cleanText,
                    content_hash: contentHash,
                    diff_summary: initialSummary,
                })
                .select()
                .single();

            if (insertError) throw new AppError("Failed to save initial baseline result", 500);

            return NextResponse.json({ status: "initial_baseline", check: firstCheck as LinkCheck, diff: [] });
        }

        // Step 5: No change — store record and return early
        if (lastCheck.content_hash === contentHash) {
            const { data: noChangeCheck, error: insertError } = await supabase
                .from("link_checks")
                .insert({ link_id: id, status: "no_change", raw_content: cleanText, content_hash: contentHash })
                .select()
                .single();

            if (insertError) throw new AppError("Failed to save no-change result", 500);

            return NextResponse.json({ status: "no_change", check: noChangeCheck as LinkCheck, diff: null });
        }

        // Step 6: Compute word-level diff since changes exist
        const previousContent = lastCheck.raw_content ?? "";
        const diffResult = diffWords(previousContent, cleanText);
        const diffChanges: DiffChange[] = diffResult.map((part) => ({
            value: part.value,
            added: part.added || undefined,
            removed: part.removed || undefined,
        }));

        // Step 7: Build diff-only text for Gemini (token-efficient)
        const addedText = diffResult
            .filter((p) => p.added)
            .map((p) => p.value)
            .join(" ")
            .slice(0, DIFF_TEXT_MAX_CHARS);

        const removedText = diffResult
            .filter((p) => p.removed)
            .map((p) => p.value)
            .join(" ")
            .slice(0, DIFF_TEXT_MAX_CHARS);

        const diffSummary = await summarizeChanges(removedText, addedText);

        // Step 7: Persist and return
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
            throw new AppError("Failed to save check result", 500);
        }

        return NextResponse.json({ status: "success", check: successCheck as LinkCheck, diff: diffChanges });
    } catch (error) {
        return handleError(error, "runCheck");
    }
}
