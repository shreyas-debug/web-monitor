/**
 * handleError — Central error-to-NextResponse converter.
 *
 * Maps any thrown error type to the appropriate JSON response:
 * - AppError           → uses its own statusCode + message
 * - ZodError           → 400 with field-level validation messages
 * - Everything else    → 500 Internal Server Error
 *
 * Usage in controllers:
 * ```typescript
 * try {
 *   // ... business logic
 * } catch (error) {
 *   return handleError(error, "[context label]");
 * }
 * ```
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./AppError";

export function handleError(error: unknown, context: string): NextResponse {
    if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof ZodError) {
        const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return NextResponse.json({ error: message }, { status: 400 });
    }

    // Unknown error — log it and return a generic 500
    console.error(`[${context}] Unexpected error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
