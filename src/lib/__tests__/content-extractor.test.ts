/**
 * Content extraction tests.
 *
 * Verifies that HTML is cleaned correctly, scripts/styles are stripped,
 * and hashing is deterministic.
 */

import { describe, it, expect } from "vitest";
import { extractReadableText, computeContentHash } from "../content-extractor";

describe("extractReadableText", () => {
    it("strips <script> tags from body", () => {
        const html = `<html><body><p>Hello world</p><script>alert('xss')</script></body></html>`;
        const result = extractReadableText(html, "https://example.com");
        expect(result).not.toContain("alert");
        expect(result).toContain("Hello world");
    });

    it("strips <style> tags from body", () => {
        const html = `<html><body><p>Content</p><style>body { color: red; }</style></body></html>`;
        const result = extractReadableText(html, "https://example.com");
        expect(result).not.toContain("color: red");
        expect(result).toContain("Content");
    });

    it("strips <noscript> tags", () => {
        const html = `<html><body><p>Main text</p><noscript>Enable JS</noscript></body></html>`;
        const result = extractReadableText(html, "https://example.com");
        expect(result).not.toContain("Enable JS");
    });

    it("returns readable text for article-style HTML", () => {
        const html = `
            <html><body>
                <article>
                    <h1>Big Title</h1>
                    <p>This is a paragraph with more than fifty characters to pass the Readability threshold.</p>
                </article>
            </body></html>`;
        const result = extractReadableText(html, "https://example.com/article");
        expect(result.length).toBeGreaterThan(10);
    });

    it("falls back to body text for non-article pages", () => {
        const html = `<html><body><div class="widget">Some widget text</div></body></html>`;
        const result = extractReadableText(html, "https://example.com");
        expect(result).toContain("Some widget text");
    });

    it("handles empty HTML gracefully", () => {
        const result = extractReadableText("", "https://example.com");
        expect(result).toBe("");
    });
});

describe("computeContentHash", () => {
    it("returns the same hash for identical content", () => {
        const hash1 = computeContentHash("hello world");
        const hash2 = computeContentHash("hello world");
        expect(hash1).toBe(hash2);
    });

    it("returns different hashes for different content", () => {
        const hash1 = computeContentHash("hello world");
        const hash2 = computeContentHash("goodbye world");
        expect(hash1).not.toBe(hash2);
    });

    it("returns a 64-character hex string (SHA-256)", () => {
        const hash = computeContentHash("test");
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is sensitive to whitespace differences", () => {
        const hash1 = computeContentHash("hello ");
        const hash2 = computeContentHash("hello");
        expect(hash1).not.toBe(hash2);
    });
});
