/**
 * POST /api/check/[id]
 *
 * Thin route handler — delegates entirely to runCheck() controller.
 * All business logic lives in src/lib/controllers/check.controller.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { runCheck } from "@/lib/controllers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params;
    return runCheck(id);
}
