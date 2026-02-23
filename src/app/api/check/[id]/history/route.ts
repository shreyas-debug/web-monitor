/**
 * GET /api/check/[id]/history — Fetch the last 5 checks for a monitored link.
 * Returns checks ordered by most recent first.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { LinkCheck, ApiError } from "@/lib/types";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<LinkCheck[] | ApiError>> {
    try {
        const { id } = await params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return NextResponse.json({ error: "Invalid link ID format" }, { status: 400 });
        }

        // Verify the link exists
        const { data: link } = await supabase
            .from("monitored_links")
            .select("id")
            .eq("id", id)
            .single();

        if (!link) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        // Fetch the last 5 checks
        const { data: checks, error } = await supabase
            .from("link_checks")
            .select("*")
            .eq("link_id", id)
            .order("fetched_at", { ascending: false })
            .limit(5);

        if (error) {
            console.error("[GET /api/check/[id]/history] Supabase error:", error);
            return NextResponse.json({ error: "Failed to fetch check history" }, { status: 500 });
        }

        return NextResponse.json((checks || []) as LinkCheck[]);
    } catch (error) {
        console.error("[GET /api/check/[id]/history] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
