/**
 * content-extractor.ts — Clean text extraction and hashing utilities.
 *
 * Extracted from the check API route to improve modularity and
 * reduce complexity of the main request handler.
 */

import * as cheerio from "cheerio";
import { createHash } from "crypto";

/**
 * Extract clean, readable text from raw HTML using Cheerio.
 *
 * Extraction strategy:
 * 1. Load HTML into Cheerio
 * 2. Remove non-content elements (scripts, styles, navs, footers, etc.)
 * 3. Extract text and normalize whitespace
 *
 * @param html - Raw HTML string from a fetch response
 * @param url - The page URL (unused by Cheerio, kept for signature compatibility)
 * @returns Cleaned readable text content
 */
export function extractReadableText(html: string, _url: string): string {
    try {
        const $ = cheerio.load(html);

        // Remove non-content elements that clutter diffs
        $(
            "script, style, noscript, iframe, svg, nav, footer, header, .nav, .footer, .header, .menu, .sidebar, #nav, #footer, #header"
        ).remove();

        // Target the main content area if it exists, otherwise use the whole body
        let contentEl = $("main, article, [role='main'], #main, #content").first();

        if (!contentEl.length) {
            contentEl = $("body");
        }

        // Fallback to the whole document if somehow body is missing
        const rawText = contentEl.length ? contentEl.text() : $.text();

        // Clean up whitespace (remove excessive newlines and spaces)
        return rawText
            .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines to 2
            .replace(/[ \t]+/g, " ")    // Collapse multiple spaces/tabs to 1
            .trim();
    } catch (error) {
        console.warn("[content-extractor] Cheerio extraction failed:", error);

        // Final fallback: strip all HTML tags with regex
        return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
}

/**
 * Compute a SHA-256 hash of a content string.
 * Used for fast change detection without storing full content twice.
 *
 * @param content - The text content to hash
 * @returns Lowercase hex SHA-256 digest
 */
export function computeContentHash(content: string): string {
    return createHash("sha256").update(content, "utf-8").digest("hex");
}
