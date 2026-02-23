/**
 * URL normalization tests.
 *
 * Verifies that tracking params are stripped, www is removed,
 * trailing slashes are removed, and duplicate detection works.
 */

import { describe, it, expect } from "vitest";
import { normalizeUrlForStorage } from "../url-utils";

describe("normalizeUrlForStorage", () => {
    it("strips utm_source tracking param", async () => {
        const result = await normalizeUrlForStorage("https://fruit.com/apple?utm_source=twitter");
        expect(result).toBe("https://fruit.com/apple");
    });

    it("strips all utm_* params and keeps non-tracking params", async () => {
        const result = await normalizeUrlForStorage(
            "https://example.com/page?q=search&utm_medium=email&utm_campaign=spring"
        );
        expect(result).toBe("https://example.com/page?q=search");
    });

    it("treats utm-parameterized URL as same as clean URL", async () => {
        const withUtm = await normalizeUrlForStorage("https://fruit.com/apple?utm_source=newsletter");
        const clean = await normalizeUrlForStorage("https://fruit.com/apple");
        expect(withUtm).toBe(clean);
    });

    it("strips www prefix", async () => {
        const result = await normalizeUrlForStorage("https://www.example.com");
        expect(result).toBe("https://example.com");
    });

    it("removes trailing slash from paths", async () => {
        const result = await normalizeUrlForStorage("https://example.com/about/");
        expect(result).toBe("https://example.com/about");
    });

    it("forces https on http URLs", async () => {
        const result = await normalizeUrlForStorage("http://example.com");
        expect(result).toBe("https://example.com");
    });

    it("strips hash fragments", async () => {
        const result = await normalizeUrlForStorage("https://example.com/page#section");
        expect(result).toBe("https://example.com/page");
    });

    it("sorts query parameters alphabetically for consistency", async () => {
        const result = await normalizeUrlForStorage("https://example.com?z=last&a=first");
        expect(result).toBe("https://example.com/?a=first&z=last");
    });

    it("strips fbclid tracking param", async () => {
        const result = await normalizeUrlForStorage("https://example.com/page?fbclid=abc123");
        expect(result).toBe("https://example.com/page");
    });

    it("adds https when protocol is missing", async () => {
        const result = await normalizeUrlForStorage("example.com/path");
        expect(result).toBe("https://example.com/path");
    });

    it("throws on completely invalid URL", async () => {
        await expect(normalizeUrlForStorage("not a url at all!!!")).rejects.toThrow();
    });

    it("preserves meaningful query params untouched", async () => {
        const result = await normalizeUrlForStorage("https://example.com/search?q=hello&page=2");
        expect(result).toBe("https://example.com/search?page=2&q=hello");
    });
});
