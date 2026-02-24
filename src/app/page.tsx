"use client";

/**
 * Home Page — Main dashboard for the Web Monitor app.
 * Shows the add URL form, list of monitored links with their cards,
 * and an empty state when no links are added.
 */

import { useState, useMemo } from "react";
import { useLinks } from "@/hooks/useLinks";
import { AddLinkForm } from "@/components/AddLinkForm";
import { LinkCard } from "@/components/LinkCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { LinkWithLatestCheck } from "@/lib/types";

type SortOption = "recent" | "newest" | "alpha";

export default function HomePage() {
  const { links, isLoading, refresh } = useLinks();
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Extract unique projects for filter pills
  const uniqueProjects = useMemo(() => {
    return Array.from(
      new Set(links.map((link) => link.project_name || "Default"))
    ).filter(p => p !== "Default").sort();
  }, [links]);

  // Process links: Filter then Sort
  const processedLinks = useMemo(() => {
    let result = [...links];

    // 1. Filter by project
    if (selectedProject) {
      result = result.filter(
        (link) => (link.project_name || "Default") === selectedProject
      );
    }

    // 2. Sort
    result.sort((a, b) => {
      if (sortBy === "alpha") {
        return a.url.localeCompare(b.url);
      }

      if (sortBy === "recent") {
        // Sort by latest check date first
        const timeA = a.latest_check?.fetched_at ? new Date(a.latest_check.fetched_at).getTime() : 0;
        const timeB = b.latest_check?.fetched_at ? new Date(b.latest_check.fetched_at).getTime() : 0;

        if (timeA !== timeB) return timeB - timeA;

        // Fallback to insertion time if neither has been checked
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      // Default to "newest" (creation date)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [links, sortBy, selectedProject]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Web Monitor + Summary
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Track changes to any webpage. Add a URL below, click{" "}
          <span className="text-indigo-400 font-medium">&ldquo;Check Now&rdquo;</span> to
          fetch the latest content, and see exactly what changed with an AI-powered summary.
        </p>
      </div>

      {/* Add URL Form */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Add URL to Monitor
        </h2>
        <AddLinkForm onLinkAdded={refresh} currentLinkCount={links.length} />
      </div>

      {/* Monitored Links List */}
      <div className="space-y-4">
        {/* Sort & Filter Toolbar */}
        {!isLoading && links.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Monitored URLs ({processedLinks.length})
            </h2>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="recent">Most Recent Change</option>
                <option value="newest">Date Added</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </div>
        )}

        {/* Project Tag Filter Pills */}
        {!isLoading && uniqueProjects.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-3">
            <button
              onClick={() => setSelectedProject(null)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${selectedProject === null
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-medium"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                }`}
            >
              All Projects
            </button>
            {uniqueProjects.map((project) => (
              <button
                key={project}
                onClick={() => setSelectedProject(project)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${selectedProject === project
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-medium"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
              >
                {project}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full bg-zinc-800/50 rounded-xl" />
            ))}
          </div>
        ) : links.length === 0 ? (
          // New Visual Empty State
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 px-6 py-16 flex flex-col items-center justify-center">
            {/* Background glowing orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900/50 flex items-center justify-center mb-6 shadow-xl border border-zinc-700/50 relative z-10">
              <svg
                className="h-10 w-10 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-zinc-100 mb-2 relative z-10">You&apos;re not monitoring any URLs yet</h3>
            <p className="text-sm text-zinc-400 text-center max-w-sm mb-8 relative z-10">
              Add a webpage URL above to start tracking it. Our AI will automatically summarize any changes detected during a check.
            </p>

            <div className="w-full max-w-md relative z-10">
              <div className="bg-zinc-900/40 rounded-xl p-5 border border-zinc-800/80 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2 mb-4 text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="text-xs font-semibold uppercase tracking-wider">Works Best With</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">Pricing Pages</span>
                  <span className="text-xs px-2.5 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">Terms of Service</span>
                  <span className="text-xs px-2.5 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">Release Notes</span>
                  <span className="text-xs px-2.5 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">Documentation</span>
                </div>
              </div>
            </div>
          </div>
        ) : processedLinks.length === 0 && links.length > 0 ? (
          // Filter returned no results
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400">No URLs found in the &quot;{selectedProject}&quot; project.</p>
            <button onClick={() => setSelectedProject(null)} className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm">
              Clear filter
            </button>
          </div>
        ) : (
          // Link cards list
          <div className="space-y-4">
            {processedLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                onDelete={refresh}
                onCheckComplete={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
