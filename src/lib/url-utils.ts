/**
 * url-utils.ts — URL normalization utilities for the Web Monitor app.
 *
 * Normalizes URLs before they are stored in the database to ensure
 * that semantically identical URLs (e.g. with/without utm params, www,
 * trailing slash) are treated as the same resource.
 *
 * Uses the `normalize-url` ESM package from Sindre Sorhus.
 */

/**
 * Common tracking query parameters that should be stripped from URLs.
 * These do not change the page content but would otherwise create
 * duplicate records in the database.
 */
const TRACKING_PARAMS: RegExp[] = [
    /^utm_\w+$/i,   // Google Analytics: utm_source, utm_medium, etc.
    /^fbclid$/i,    // Facebook Click ID
    /^gclid$/i,     // Google Click ID
    /^msclkid$/i,   // Microsoft Click ID
    /^twclid$/i,    // Twitter Click ID
    /^ref$/i,       // Generic referral
    /^source$/i,    // Generic source
    /^campaign$/i,  // Generic campaign
    /^mc_\w+$/i,    // Mailchimp
];

/**
 * Normalize a URL for storage and deduplication.
 *
 * Transformations applied:
 * - Strips common tracking query parameters (utm_*, fbclid, gclid, etc.)
 * - Removes the www. subdomain (www.example.com → example.com)
 * - Removes trailing slashes (example.com/page/ → example.com/page)
 * - Sorts remaining query parameters alphabetically for consistency
 * - Forces HTTPS protocol
 * - Removes URL hash fragments (they don't affect server-delivered content)
 *
 * @param rawUrl - The raw URL string entered by the user
 * @returns The normalized URL string suitable for storage
 * @throws {Error} If the URL is invalid or uses an unsupported protocol
 */
export async function normalizeUrlForStorage(rawUrl: string): Promise<string> {
    // Validate it's a parseable URL first
    let parsedUrl: URL;
    try {
        // Prepend https:// if missing a protocol so new URL() doesn't throw
        const urlWithProtocol = rawUrl.match(/^https?:\/\//i) ? rawUrl : `https://${rawUrl}`;
        parsedUrl = new URL(urlWithProtocol);
    } catch {
        throw new Error(`Invalid URL: "${rawUrl}" is not a valid web address.`);
    }

    // Only allow web URLs
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error(`Unsupported protocol: "${parsedUrl.protocol}". Only HTTP and HTTPS are supported.`);
    }

    // 1. Force HTTPS
    parsedUrl.protocol = "https:";

    // 2. Strip www.
    if (parsedUrl.hostname.startsWith("www.")) {
        parsedUrl.hostname = parsedUrl.hostname.slice(4);
    }

    // 3. Strip hash fragments
    parsedUrl.hash = "";

    // 4. Strip trailing slash from pathname (except root "/")
    let pathname = parsedUrl.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
    }
    parsedUrl.pathname = pathname;

    // 5. Remove tracking parameters and sort the rest
    const params = new URLSearchParams(parsedUrl.search);
    const keysToDelete: string[] = [];

    params.forEach((_, key) => {
        if (TRACKING_PARAMS.some(regex => regex.test(key))) {
            keysToDelete.push(key);
        }
    });

    keysToDelete.forEach(key => params.delete(key));
    params.sort();

    parsedUrl.search = params.toString();

    // Reconstruct the final string manually to ensure consistency
    // e.g. URL.toString() might append a trailing slash to the hostname if pathname is empty
    return parsedUrl.toString().replace(/\/$/, "");
}
