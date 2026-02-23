/**
 * POST /api/links — Add a new URL to monitor.
 * GET /api/links  — List all monitored links with their most recent check status.
 *
 * Validation rules:
 * - URL must be valid (parseable by the URL constructor)
 * - Maximum 8 links total
 * - No duplicate URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { MonitoredLink, LinkWithLatestCheck, AddLinkRequest, ApiError } from "@/lib/types";

/**
 * GET /api/links
 * Returns all monitored links, each enriched with their most recent check.
 */
export async function GET(): Promise<NextResponse<LinkWithLatestCheck[] | ApiError>> {
    try {
        // Fetch all monitored links ordered by creation date (newest first)
        const { data: links, error: linksError } = await supabase
            .from("monitored_links")
            .select("*")
            .order("created_at", { ascending: false });

        if (linksError) {
            console.error("[GET /api/links] Supabase error:", linksError);
            return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
        }

        // For each link, fetch the most recent check
        const linksWithChecks: LinkWithLatestCheck[] = await Promise.all(
            (links as MonitoredLink[]).map(async (link) => {
                const { data: checks } = await supabase
                    .from("link_checks")
                    .select("*")
                    .eq("link_id", link.id)
                    .order("fetched_at", { ascending: false })
                    .limit(1);

                return {
                    ...link,
                    latest_check: checks && checks.length > 0 ? checks[0] : null,
                };
            })
        );

        return NextResponse.json(linksWithChecks);
    } catch (error) {
        console.error("[GET /api/links] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST /api/links
 * Add a new URL to monitor. Auto-scrapes the page title on first add.
 */
export async function POST(request: NextRequest): Promise<NextResponse<MonitoredLink | ApiError>> {
    try {
        const body: AddLinkRequest = await request.json();
        const { url, project_name } = body;

        // Validate URL format
        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch {
            return NextResponse.json(
                { error: "Invalid URL. Must be a valid HTTP or HTTPS URL." },
                { status: 400 }
            );
        }

        // Check total link count (max 8)
        const { count, error: countError } = await supabase
            .from("monitored_links")
            .select("*", { count: "exact", head: true });

        if (countError) {
            console.error("[POST /api/links] Count error:", countError);
            return NextResponse.json({ error: "Failed to check link count" }, { status: 500 });
        }

        if (count !== null && count >= 8) {
            return NextResponse.json(
                { error: "Maximum of 8 monitored links reached. Remove a link before adding a new one." },
                { status: 400 }
            );
        }

        // Check for duplicates
        const { data: existing } = await supabase
            .from("monitored_links")
            .select("id")
            .eq("url", parsedUrl.href)
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json(
                { error: "This URL is already being monitored." },
                { status: 409 }
            );
        }

        // Attempt to auto-scrape the page title
        let title: string | null = null;
        try {
            const response = await fetch(parsedUrl.href, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                signal: AbortSignal.timeout(10000),
            });
            const html = await response.text();

            // Extract title from HTML using a simple regex (lightweight, no full DOM parse needed)
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim().slice(0, 200);
            }
        } catch {
            // Title scraping is best-effort — don't block link creation on failure
            console.warn(`[POST /api/links] Could not scrape title for ${parsedUrl.href}`);
        }

        // Insert the new link
        const { data: newLink, error: insertError } = await supabase
            .from("monitored_links")
            .insert({ url: parsedUrl.href, title, project_name: project_name || "Default" })
            .select()
            .single();

        if (insertError) {
            console.error("[POST /api/links] Insert error:", insertError);
            return NextResponse.json({ error: "Failed to add link" }, { status: 500 });
        }

        return NextResponse.json(newLink as MonitoredLink, { status: 201 });
    } catch (error) {
        console.error("[POST /api/links] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
