/**
 * GET  /api/links — List all monitored links with latest check status.
 * POST /api/links — Add a new URL to monitor.
 *
 * Thin route handler — delegates to links controller.
 * All business logic lives in src/lib/controllers/links.controller.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { listLinks, addLink } from "@/lib/controllers/links.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
    return listLinks();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const body = await request.json();
    return addLink(body);
}
