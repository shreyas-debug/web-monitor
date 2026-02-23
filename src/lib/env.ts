/**
 * Centralized environment variable validation.
 * Uses lazy evaluation — variables are only validated when first accessed,
 * not at import time. This allows the build to succeed without env vars set.
 */

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}. ` +
            `Check your .env.local file and ensure all variables from .env.example are set.`
        );
    }
    return value;
}

/**
 * Validated environment variables for server-side use only.
 * Each property is lazily evaluated using getters — validation only runs
 * when the variable is actually accessed at runtime, not during build.
 */
export const env = {
    /** Supabase project URL (public, used in client config) */
    get supabaseUrl(): string {
        return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    },

    /** Supabase anon key (public, but we use service role key for API routes) */
    get supabaseAnonKey(): string {
        return getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },

    /** Supabase service role key — bypasses RLS, server-side only */
    get supabaseServiceRoleKey(): string {
        return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    },

    /** Google Gemini API key — server-side only, never expose to client */
    get geminiApiKey(): string {
        return getRequiredEnv("GEMINI_API_KEY");
    },
};
