/**
 * constants.ts — Application-wide constants.
 *
 * All magic values live here. Never hardcode these inline.
 */

/** Maximum number of monitored links per user */
export const MAX_LINKS = 8;

/** HTTP fetch timeout in milliseconds (8s to beat Vercel's 10s limit) */
export const FETCH_TIMEOUT_MS = 8_000;

/** Maximum characters of added/removed diff text sent to Gemini */
export const DIFF_TEXT_MAX_CHARS = 1_500;

/** Maximum characters of page title stored from auto-scraping */
export const TITLE_MAX_CHARS = 200;

/** Gemini model to use for summarization */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Default project name when none is provided */
export const DEFAULT_PROJECT_NAME = "Default";

/** Chrome-like User-Agent to reduce bot-blocking by target sites */
export const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** UUID v4 regex for route parameter validation */
export const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
