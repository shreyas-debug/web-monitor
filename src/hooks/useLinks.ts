"use client";

/**
 * useLinks — Custom React hook for fetching and refreshing monitored links.
 *
 * Extracts data-fetching state from page.tsx so the component
 * focuses purely on rendering, not data management.
 *
 * @returns links, isLoading state, and a refresh() function
 */

import { useState, useEffect, useCallback } from "react";
import type { LinkWithLatestCheck } from "@/lib/types";

interface UseLinksResult {
    links: LinkWithLatestCheck[];
    isLoading: boolean;
    refresh: () => Promise<void>;
}

export function useLinks(): UseLinksResult {
    const [links, setLinks] = useState<LinkWithLatestCheck[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const response = await fetch("/api/links");
            if (response.ok) {
                const data: LinkWithLatestCheck[] = await response.json();
                setLinks(data);
            }
        } catch (error) {
            console.error("[useLinks] Failed to fetch links:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { links, isLoading, refresh };
}
