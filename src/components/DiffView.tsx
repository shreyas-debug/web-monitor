"use client";

/**
 * DiffView — Renders word-level diffs with color highlighting.
 * Shows added words in green, removed words in red, unchanged in default color.
 * Below the diff, displays the Gemini AI summary with cited snippets as blockquotes.
 */

import type { DiffChange, DiffSummary } from "@/lib/types";

interface DiffViewProps {
    diff: DiffChange[];
    summary: DiffSummary | null;
}

export function DiffView({ diff, summary }: DiffViewProps) {
    return (
        <div className="mt-4 space-y-4">
            {/* Diff Output */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 overflow-x-auto">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Content Diff
                </h4>
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {diff.map((part, index) => {
                        if (part.added) {
                            return (
                                <span
                                    key={index}
                                    className="bg-emerald-500/20 text-emerald-300 rounded px-0.5"
                                >
                                    {part.value}
                                </span>
                            );
                        }
                        if (part.removed) {
                            return (
                                <span
                                    key={index}
                                    className="bg-red-500/20 text-red-300 line-through rounded px-0.5"
                                >
                                    {part.value}
                                </span>
                            );
                        }
                        return (
                            <span key={index} className="text-zinc-400">
                                {part.value}
                            </span>
                        );
                    })}
                </pre>
            </div>

            {/* AI Summary */}
            {summary && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <svg
                                className="h-3 w-3 text-indigo-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                                />
                            </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-indigo-300">AI Summary</h4>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">{summary.summary}</p>

                    {summary.citations.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Key Snippets
                            </h5>
                            {summary.citations.map((citation, index) => (
                                <blockquote
                                    key={index}
                                    className="border-l-2 border-indigo-500/40 pl-3 py-1 text-xs text-zinc-400 italic"
                                >
                                    &ldquo;{citation}&rdquo;
                                </blockquote>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
