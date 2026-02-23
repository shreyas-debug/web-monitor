/**
 * Server-side Supabase client.
 * Uses the service role key to bypass Row Level Security (RLS).
 * This module must ONLY be imported in API routes / server components — never client-side.
 *
 * Uses lazy initialization to avoid env var validation during build time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _supabase: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client for server-side operations.
 * Lazily initialized on first call to avoid build-time env var errors.
 */
function getSupabaseClient(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return _supabase;
}

/**
 * Proxy that lazily initializes the Supabase client on first property access.
 * This allows importing `supabase` at the module level without triggering
 * env var validation during build time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        const client = getSupabaseClient();
        const value = Reflect.get(client, prop, receiver);
        if (typeof value === "function") {
            return value.bind(client);
        }
        return value;
    },
});
