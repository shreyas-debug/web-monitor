/**
 * DELETE /api/links/[id] — Delete a monitored link and all its check history.
 *
 * Thin route handler — delegates to deleteLink() controller.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteLink } from "@/lib/controllers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;
    return deleteLink(id);
}
