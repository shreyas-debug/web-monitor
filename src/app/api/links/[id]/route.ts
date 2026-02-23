/**
 * DELETE /api/links/[id] — Delete a monitored link and all its check history.
 * The database cascade will automatically delete associated link_checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiError } from "@/lib/types";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: true } | ApiError>> {
    try {
        const { id } = await params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return NextResponse.json({ error: "Invalid link ID format" }, { status: 400 });
        }

        // Attempt to delete the link (cascade handles link_checks)
        const { error, count } = await supabase
            .from("monitored_links")
            .delete({ count: "exact" })
            .eq("id", id);

        if (error) {
            console.error("[DELETE /api/links/[id]] Supabase error:", error);
            return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
        }

        if (count === 0) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true as const });
    } catch (error) {
        console.error("[DELETE /api/links/[id]] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
