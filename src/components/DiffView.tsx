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
    const leftText = diff.filter(p => !p.added);
    const rightText = diff.filter(p => !p.removed);

    return (
        <div className="mt-4 space-y-4">
            {/* Diff Output */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 overflow-x-auto w-full">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Content Diff (Side-by-Side)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Previous Version */}
                    <div className="rounded bg-zinc-900/50 border border-zinc-800 flex flex-col max-h-[300px]">
                        <div className="px-3 pt-3 pb-2 sticky top-0 bg-zinc-900/95 z-10 border-b border-zinc-800 flex-shrink-0">
                            <h5 className="text-[10px] font-bold uppercase text-zinc-500">Previous Version</h5>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 h-full">
                            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-zinc-300">
                                {leftText.map((part, index) => (
                                    part.removed ? (
                                        <span key={index} className="bg-red-500/20 text-red-300 line-through rounded px-0.5">
                                            {part.value}
                                        </span>
                                    ) : (
                                        <span key={index}>{part.value}</span>
                                    )
                                ))}
                            </pre>
                        </div>
                    </div>

                    {/* New Version */}
                    <div className="rounded bg-zinc-900/50 border border-zinc-800 flex flex-col max-h-[300px]">
                        <div className="px-3 pt-3 pb-2 sticky top-0 bg-zinc-900/95 z-10 border-b border-zinc-800 flex-shrink-0">
                            <h5 className="text-[10px] font-bold uppercase text-zinc-500">Current Version</h5>
                        </div>
                        <div className="p-3 overflow-y-auto flex-1 h-full">
                            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-zinc-300">
                                {rightText.map((part, index) => (
                                    part.added ? (
                                        <span key={index} className="bg-emerald-500/20 text-emerald-300 rounded px-0.5">
                                            {part.value}
                                        </span>
                                    ) : (
                                        <span key={index}>{part.value}</span>
                                    )
                                ))}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Summary */}
            {summary ? (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 mt-4">
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
            ) : (
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center">
                            <svg className="h-3 w-3 text-amber-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-400">AI Summary Unavailable</h4>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        The changes were recorded, but the summary could not be generated. This usually happens if the AI provider's temporary rate limits have been reached, or if the text was too large.
                    </p>
                </div>
            )}
        </div>
    );
}
