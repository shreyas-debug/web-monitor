"use client";

/**
 * StatusBadge — Color-coded badge indicating the status of a link check.
 * Green for success, yellow for no_change, red for error, gray for not checked.
 */

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: "success" | "no_change" | "error" | "initial_baseline" | null;
}

const statusConfig = {
    success: {
        label: "Changed",
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
    },
    no_change: {
        label: "No Change",
        className: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
    },
    error: {
        label: "Error",
        className: "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20",
    },
    initial_baseline: {
        label: "Baseline",
        className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20",
    },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
    if (!status) {
        return (
            <Badge variant="outline" className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30">
                Not Checked
            </Badge>
        );
    }

    const config = statusConfig[status];
    return (
        <Badge variant="outline" className={config.className}>
            {config.label}
        </Badge>
    );
}
