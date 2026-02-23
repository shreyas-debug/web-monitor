/**
 * links.controller.ts — Business logic for monitored links CRUD.
 *
 * Exports:
 * - listLinks()         GET all links with their most recent check
 * - addLink(body)       Validate, normalize, and store a new link
 * - deleteLink(id)      Remove a link and its associated checks
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeUrlForStorage } from "@/lib/url-utils";
import { AppError, handleError } from "@/lib/errors";
import { AddLinkSchema } from "@/lib/schemas";
import { MAX_LINKS, USER_AGENT, TITLE_MAX_CHARS, DEFAULT_PROJECT_NAME } from "@/lib/constants";
import type { MonitoredLink, LinkWithLatestCheck } from "@/lib/types";

/**
 * Attempt to auto-scrape the <title> of a page.
 * Best-effort — never throws; returns null on any failure.
 */
async function scrapePageTitle(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(10_000),
        });
        const html = await response.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match?.[1]?.trim().slice(0, TITLE_MAX_CHARS) ?? null;
    } catch {
        console.warn(`[links.controller] Could not scrape title for ${url}`);
        return null;
    }
}

/**
 * List all monitored links, each paired with their most recent check result.
 */
export async function listLinks(): Promise<NextResponse> {
    try {
        const { data: links, error: linksError } = await supabase
            .from("monitored_links")
            .select("*")
            .order("created_at", { ascending: false });

        if (linksError) {
            throw new AppError("Failed to fetch links", 500);
        }

        const linksWithChecks: LinkWithLatestCheck[] = await Promise.all(
            (links as MonitoredLink[]).map(async (link) => {
                const { data: checks } = await supabase
                    .from("link_checks")
                    .select("*")
                    .eq("link_id", link.id)
                    .order("fetched_at", { ascending: false })
                    .limit(1);

                return { ...link, latest_check: checks?.[0] ?? null };
            })
        );

        return NextResponse.json(linksWithChecks);
    } catch (error) {
        return handleError(error, "listLinks");
    }
}

/**
 * Add a new URL to monitor.
 *
 * Validates the request body with Zod, normalizes the URL,
 * checks for duplicates and the 8-link cap, then inserts.
 *
 * @param body - Raw request body (unknown — validated internally)
 */
export async function addLink(body: unknown): Promise<NextResponse> {
    try {
        // Zod validates and provides type-safe defaults
        const { url, project_name } = AddLinkSchema.parse(body);

        // Normalize URL (strips utm params, www, trailing slash, forces https)
        const normalizedUrl = await normalizeUrlForStorage(url).catch((err) => {
            throw new AppError(
                err instanceof Error ? err.message : "Invalid URL",
                400
            );
        });

        // Enforce the max-link cap
        const { count, error: countError } = await supabase
            .from("monitored_links")
            .select("*", { count: "exact", head: true });

        if (countError) throw new AppError("Failed to check link count", 500);
        if (count !== null && count >= MAX_LINKS) {
            throw new AppError(
                `Maximum of ${MAX_LINKS} monitored links reached. Remove one before adding another.`,
                400
            );
        }

        // Check for duplicate (normalized URL)
        const { data: existing } = await supabase
            .from("monitored_links")
            .select("id")
            .eq("url", normalizedUrl)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new AppError("This URL is already being monitored.", 409);
        }

        const title = await scrapePageTitle(normalizedUrl);

        const { data: newLink, error: insertError } = await supabase
            .from("monitored_links")
            .insert({ url: normalizedUrl, title, project_name: project_name ?? DEFAULT_PROJECT_NAME })
            .select()
            .single();

        if (insertError) throw new AppError("Failed to add link", 500);

        return NextResponse.json(newLink as MonitoredLink, { status: 201 });
    } catch (error) {
        return handleError(error, "addLink");
    }
}

/**
 * Delete a monitored link by ID.
 * Associated link_checks are cascade-deleted by the database.
 *
 * @param id - UUID of the link to delete
 */
export async function deleteLink(id: string): Promise<NextResponse> {
    try {
        const { error } = await supabase
            .from("monitored_links")
            .delete()
            .eq("id", id);

        if (error) throw new AppError("Failed to delete link", 500);

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error, "deleteLink");
    }
}
