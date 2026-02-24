import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client.
// Falls back to a mock if env vars are missing so the app doesn't crash on boot.
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        : null;

// Create a sliding window rate limiter: 5 requests per 1 minute.
const ratelimit = redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
    })
    : null;

/**
 * Root Next.js Edge Middleware
 * 
 * Responsibilities:
 * 1. Attach fundamental security headers to all responses.
 * 2. Apply Upstash Rate Limiting specifically to the expensive `/api/check` route.
 */
export async function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // 1. Core Security Headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );

    // 2. Anti-DoS Rate Limiting on the scraping/AI endpoint
    if (request.nextUrl.pathname.startsWith("/api/check") && request.method === "POST") {
        if (!ratelimit) {
            console.warn("[Middleware] Rate limiting bypassed: Upstash Redis env vars missing.");
            return response; // Bypass if not configured
        }

        // Use IP address as the rate limiting identifier. Fallback to global if IP is obfuscated.
        const reqIp = (request as any).ip ?? request.headers.get("x-forwarded-for") ?? "global";
        const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_check_${reqIp}`);

        if (!success) {
            console.warn(`[Middleware] Rate limit exceeded for IP: ${reqIp}`);

            return NextResponse.json(
                { error: "Too many requests. Please wait a minute before checking again." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                        "X-RateLimit-Reset": reset.toString(),
                        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
                    },
                }
            );
        }

        // Add rate-limiting headers to successful responses for client awareness
        response.headers.set("X-RateLimit-Limit", limit.toString());
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", reset.toString());
    }

    return response;
}

// Ensure middleware runs on API routes and pages, skipping static Next.js assets
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
