/**
 * GET /api/status — Health check endpoint.
 * Pings Supabase (SELECT 1) and Gemini (minimal generate) to verify connectivity.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkGeminiHealth } from "@/lib/gemini";
import type { StatusResponse } from "@/lib/types";

export async function GET(): Promise<NextResponse<StatusResponse>> {
    let databaseStatus: "ok" | "error" = "error";
    let llmStatus: "ok" | "error" = "error";

    // Check Supabase connectivity with a simple query
    try {
        const { error } = await supabase.from("monitored_links").select("id").limit(1);
        databaseStatus = error ? "error" : "ok";
    } catch {
        databaseStatus = "error";
    }

    // Check Gemini API connectivity
    try {
        const healthy = await checkGeminiHealth();
        llmStatus = healthy ? "ok" : "error";
    } catch {
        llmStatus = "error";
    }

    const response: StatusResponse = {
        backend: "ok",
        database: databaseStatus,
        llm: llmStatus,
        timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
}
