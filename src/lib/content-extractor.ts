/**
 * content-extractor.ts — Clean text extraction and hashing utilities.
 *
 * Extracted from the check API route to improve modularity and
 * reduce complexity of the main request handler.
 */

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { createHash } from "crypto";

/**
 * Extract clean, readable text from raw HTML using Mozilla's Readability algorithm.
 *
 * Extraction priority:
 * 1. Readability (best for article/blog/news content)
 * 2. Raw body text with scripts/styles removed (for pages Readability can't parse)
 * 3. Regex tag stripping (final fallback)
 *
 * @param html - Raw HTML string from a fetch response
 * @param url - The page URL (required by JSDOM for relative link resolution)
 * @returns Cleaned readable text content
 */
export function extractReadableText(html: string, url: string): string {
    const readabilityText = tryReadability(html, url);
    if (readabilityText.length > 50) {
        return readabilityText;
    }

    const bodyText = tryBodyExtraction(html, url);
    if (bodyText.length > 0) {
        return bodyText;
    }

    // Final fallback: strip all HTML tags with regex
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Attempt Readability-based extraction.
 * Returns empty string if Readability fails or produces insufficient content.
 */
function tryReadability(html: string, url: string): string {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article?.textContent) {
            return article.textContent.replace(/\n{3,}/g, "\n\n").trim();
        }
    } catch (error) {
        console.warn("[content-extractor] Readability failed:", error);
    }
    return "";
}

/**
 * Attempt raw DOM body text extraction with script/style removal.
 */
function tryBodyExtraction(html: string, url: string): string {
    try {
        const dom = new JSDOM(html, { url });
        const body = dom.window.document.body;
        if (!body) return "";

        // Remove non-content elements
        body.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
        return (body.textContent ?? "").replace(/\s+/g, " ").trim();
    } catch {
        return "";
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
