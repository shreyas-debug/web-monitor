"use client";

/**
 * Home Page — Main dashboard for the Web Monitor app.
 * Shows the add URL form, list of monitored links with their cards,
 * and an empty state when no links are added.
 */

import { useLinks } from "@/hooks/useLinks";
import { AddLinkForm } from "@/components/AddLinkForm";
import { LinkCard } from "@/components/LinkCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { LinkWithLatestCheck } from "@/lib/types";

export default function HomePage() {
  const { links, isLoading, refresh } = useLinks();

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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Monitored URLs ({links.length})
        </h2>

        {isLoading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full bg-zinc-800/50 rounded-xl" />
            ))}
          </div>
        ) : links.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <div className="h-16 w-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
              <svg
                className="h-8 w-8 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.636"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">No URLs monitored yet</h3>
            <p className="text-sm text-zinc-500 text-center max-w-sm">
              Add a webpage URL above to start monitoring it for changes. Great for tracking
              pricing pages, documentation, or policy updates.
            </p>
          </div>
        ) : (
          // Link cards grouped by project
          <div className="space-y-6">
            {Object.entries(
              links.reduce((acc, link) => {
                const project = link.project_name || "Default";
                if (!acc[project]) acc[project] = [];
                acc[project].push(link);
                return acc;
              }, {} as Record<string, LinkWithLatestCheck[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([project, projectLinks]) => (
              <div key={project} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80 bg-indigo-500/10 py-1 px-3 rounded-full inline-block">
                  {project}
                </h3>
                <div className="space-y-3 pl-2 border-l-2 border-zinc-800 ml-1">
                  {projectLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      onDelete={refresh}
                      onCheckComplete={refresh}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
