"use client";

/**
 * LinkCard — Displays a monitored link with its status, check history,
 * "Check Now" button, and inline diff/AI summary view.
 *
 * Features:
 * - Collapsible card: click header to expand/collapse
 * - Shows URL, title, last checked timestamp, and status badge
 * - "Check Now" button with loading spinner and 30-second cooldown
 * - Expandable history showing the last 5 checks
 * - Inline diff view and AI summary after a check reveals changes
 * - Delete button with confirmation
 */

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import { DiffView, parseMarkdownBold } from "./DiffView";
import type { LinkWithLatestCheck, LinkCheck, CheckResult, DiffChange } from "@/lib/types";

interface LinkCardProps {
    link: LinkWithLatestCheck;
    onDelete: () => void;
    onCheckComplete: () => void;
}

export function LinkCard({ link, onDelete, onCheckComplete }: LinkCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [diffData, setDiffData] = useState<DiffChange[] | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<LinkCheck[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

    // Cooldown timer: decrements every second until 0
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    /** Execute a content check for this link */
    const handleCheck = useCallback(async () => {
        setIsChecking(true);
        setError(null);
        setCheckResult(null);
        setDiffData(null);
        // Auto-expand so the user can see the result
        setIsExpanded(true);

        try {
            const response = await fetch(`/api/check/${link.id}`, { method: "POST" });
            const data: CheckResult = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    const resetTimeStr = response.headers.get("x-ratelimit-reset");
                    if (resetTimeStr) {
                        const resetTime = parseInt(resetTimeStr, 10);
                        const secWait = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
                        setCooldown(secWait);
                        const msg = `Rate limit exceeded. Try again in ${secWait} seconds.`;
                        setError(msg);
                        toast.error(msg);
                        return;
                    }
                }

                const msg = "error" in data ? String((data as { error: string }).error) : "Check failed";
                setError(msg);
                toast.error(msg);
                return;
            }

            setCheckResult(data);
            if (data.diff) {
                setDiffData(data.diff);
            }

            // Start 30-second cooldown
            setCooldown(30);
            toast.success("Check completed successfully");
            onCheckComplete();
        } catch {
            setError("Network error. Please try again.");
            toast.error("Network error. Please try again.");
        } finally {
            setIsChecking(false);
        }
    }, [link.id, onCheckComplete]);

    /** Fetch check history for this link */
    const handleToggleHistory = useCallback(async () => {
        if (showHistory) {
            setShowHistory(false);
            return;
        }

        setLoadingHistory(true);
        try {
            const response = await fetch(`/api/check/${link.id}/history`);
            const data = await response.json();
            if (response.ok) {
                setHistory(data);
            }
        } catch {
            console.error("Failed to fetch history");
        } finally {
            setLoadingHistory(false);
            setShowHistory(true);
        }
    }, [link.id, showHistory]);

    /** Delete this link */
    const handleDelete = useCallback(async () => {
        if (!confirm("Remove this URL from monitoring? All check history will be deleted.")) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/links/${link.id}`, { method: "DELETE" });
            if (response.ok) {
                toast.success("URL removed from monitoring");
                onDelete();
            } else {
                toast.error("Failed to delete link");
            }
        } catch {
            toast.error("Failed to delete link");
            setError("Failed to delete link");
        } finally {
            setIsDeleting(false);
        }
    }, [link.id, onDelete]);

    /** Format a timestamp into a human-readable relative or absolute string */
    function formatTimestamp(timestamp: string | null): string {
        if (!timestamp) return "Never checked";
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const handleHistoryClick = useCallback((checkId: string) => {
        if (selectedHistoryId === checkId) {
            setSelectedHistoryId(null);
        } else {
            setSelectedHistoryId(checkId);
        }
    }, [selectedHistoryId]);

    // Use the most recent check result: local state (from a just-completed check) takes priority
    const lastCheckStatus = checkResult?.status || link.latest_check?.status || null;
    const lastCheckTime = checkResult?.check?.fetched_at || link.latest_check?.fetched_at || null;

    // Highlight if the *latest* check was successful (meaning a change was found & diff recorded)
    const hasRecentChanges = lastCheckStatus === "success";

    return (
        <Card className={`transition-all duration-300 relative overflow-hidden ${hasRecentChanges
            ? "bg-zinc-900/80 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-400"
            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            }`}>
            {/* Loading Overlay */}
            {isChecking && (
                <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] z-10 pointers-events-none flex items-center justify-center pointer-events-none">
                    <div className="bg-zinc-900/90 rounded-full px-4 py-2 border border-indigo-500/30 flex items-center gap-2 shadow-xl">
                        <svg className="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium text-indigo-300">Checking...</span>
                    </div>
                </div>
            )}

            {/* ── Collapsed Header (always visible) ── */}
            <div
                className={`flex items-center justify-between gap-3 p-4 cursor-pointer select-none ${isChecking ? 'opacity-30' : 'opacity-100'}`}
                onClick={() => !isChecking && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Expand/collapse chevron */}
                    <svg
                        className={`h-4 w-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""
                            }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>

                    {/* Title and URL (compact) */}
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-zinc-100 items-center flex gap-2 text-sm truncate">
                                {link.title || new URL(link.url).hostname}
                                {link.project_name && link.project_name !== "Default" && (
                                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 hidden sm:inline-block py-0.5 px-2 rounded-full border border-indigo-500/20">
                                        {link.project_name}
                                    </span>
                                )}
                            </h3>
                            <span className="text-xs text-zinc-500 truncate block">{link.url}</span>
                        </div>
                    </div>

                    {/* Status and timestamp (compact) */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-zinc-500 hidden sm:inline">
                            {formatTimestamp(lastCheckTime)}
                        </span>
                        <StatusBadge status={lastCheckStatus} />
                    </div>
                </div>

                {/* Action buttons on header row (stop propagation so clicks don't toggle) */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        onClick={handleCheck}
                        disabled={isChecking || cooldown > 0}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 h-7 px-3 min-w-[100px]"
                    >
                        {isChecking ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Checking...</span>
                            </span>
                        ) : cooldown > 0 ? (
                            `Wait ${cooldown}s`
                        ) : (
                            "Check Now"
                        )}
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                        title="Remove this URL"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
            </div>

            {/* ── Expanded Content ── */}
            {isExpanded && (
                <CardContent className="px-5 pb-5 pt-0 border-t border-zinc-800/50">
                    {/* URL link */}
                    <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 mt-3"
                    >
                        Open page
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>

                    {/* History toggle */}
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-800/50 pt-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleToggleHistory}
                            className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs h-8 px-3 transition-all"
                        >
                            {showHistory ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    </svg>
                                    Hide History
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Show History
                                </span>
                            )}
                        </Button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Check Result: Diff + AI Summary (always shown above history) */}
                    {checkResult && checkResult.status === "success" && diffData && diffData.length > 0 && (
                        <DiffView
                            diff={diffData}
                            summary={checkResult.check.diff_summary}
                        />
                    )}

                    {/* Check Result: First check success (Baseline Established) */}
                    {checkResult && checkResult.status === "initial_baseline" && (
                        <div className="mt-4 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                            <h4 className="text-sm font-semibold text-indigo-400 flex items-center gap-2 mb-2">
                                Baseline Established 🎯
                            </h4>
                            <p className="text-xs text-indigo-300/80 mb-3">
                                This is the first time we&apos;ve checked this page. We&apos;ve saved the current version. Future checks will highlight any changes made from today onwards.
                            </p>

                            {/* Show the initial Gemini Summary if generated */}
                            {checkResult.check.diff_summary && (
                                <div className="mt-3 bg-zinc-950/50 rounded-md p-3 border border-zinc-800/60">
                                    <h5 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1.5">
                                        <svg className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Page Overview
                                    </h5>
                                    <p className="text-xs leading-relaxed text-zinc-300">
                                        {parseMarkdownBold(checkResult.check.diff_summary.summary)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Check Result: No Change message */}
                    {checkResult && checkResult.status === "no_change" && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <p className="text-sm text-amber-300 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                No changes detected since the last check.
                            </p>
                        </div>
                    )}

                    {/* Check Result: Error message (always shown above history for the active check) */}
                    {checkResult && checkResult.status === "error" && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                            <p className="text-sm text-red-400 flex items-center gap-2">
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Check Failed: {checkResult.check.error_message || "Unknown error"}
                            </p>
                        </div>
                    )}

                    {/* Check History (expandable) */}
                    {showHistory && (
                        <div className="mt-4 border-t border-zinc-800 pt-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                Check History (Last 5)
                            </h4>
                            {loadingHistory ? (
                                <p className="text-xs text-zinc-500">Loading...</p>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-zinc-500">No checks performed yet</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {history.map((check) => (
                                        <div
                                            key={check.id}
                                            className={`flex flex-col py-1.5 px-2 rounded cursor-pointer transition-colors ${selectedHistoryId === check.id ? "bg-zinc-800" : "bg-zinc-800/50 hover:bg-zinc-800"}`}
                                            onClick={() => handleHistoryClick(check.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-zinc-400">
                                                    {new Date(check.fetched_at).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                                <StatusBadge status={check.status} />
                                            </div>
                                            {selectedHistoryId === check.id && (
                                                <div className="mt-2 text-xs text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-700/50 shadow-inner cursor-default space-y-3" onClick={(e) => e.stopPropagation()}>
                                                    {check.diff_summary ? (
                                                        <>
                                                            <div>
                                                                <span className="font-semibold text-indigo-400 flex items-center gap-1.5 mb-1.5">
                                                                    <svg className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                    AI Summary
                                                                </span>
                                                                <p className="leading-relaxed text-zinc-300">
                                                                    {parseMarkdownBold(check.diff_summary.summary)}
                                                                </p>
                                                            </div>
                                                            {check.diff_summary.citations && check.diff_summary.citations.length > 0 && (
                                                                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Key Snippets</span>
                                                                    {check.diff_summary.citations.map((citation, idx) => (
                                                                        <blockquote key={idx} className="border-l-2 border-indigo-500/40 pl-2 py-0.5 text-zinc-400 italic text-[11px] leading-relaxed">
                                                                            &ldquo;{citation}&rdquo;
                                                                        </blockquote>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : check.status === "initial_baseline" ? (
                                                        <span className="text-indigo-400 italic">Baseline established.</span>
                                                    ) : check.status === "error" ? (
                                                        <span className="text-red-400 font-medium">Failed: {check.error_message || "Unknown error during check."}</span>
                                                    ) : check.status === "no_change" ? (
                                                        <span className="text-zinc-500 italic">No changes detected in this check.</span>
                                                    ) : (
                                                        <span className="text-zinc-500 italic">No AI summary available.</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
