/**
 * content-extractor.ts — Clean text extraction and hashing utilities.
 *
 * Extracted from the check API route to improve modularity and
 * reduce complexity of the main request handler.
 */

import * as cheerio from "cheerio";

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

        let contentEl = $("main, article, [role='main'], #main, #content").first();

        // Fallback to the whole document body if semantic tags are missing
        if (!contentEl.length) {
            contentEl = $("body");
        }

        let rawText = contentEl.text();

        // If semantic tags were found but they are suspiciously empty, fall back to body
        if (rawText.trim().length < 50 && contentEl.get(0)?.tagName.toLowerCase() !== 'body') {
            rawText = $("body").text();
        }

        // Final fallback to the whole document
        if (!rawText.trim()) {
            rawText = $.text();
        }

        // Clean up whitespace (remove excessive newlines and spaces)
        return rawText
            .replace(/^[ \t]+|[ \t]+$/gm, "") // Trim spaces from start/end of each line
            .replace(/\n{3,}/g, "\n\n")       // Collapse 3+ newlines to 2
            .replace(/[ \t]+/g, " ")          // Collapse multiple spaces/tabs to 1
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
export async function computeContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
