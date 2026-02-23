"use client";

/**
 * Status Page — Health dashboard showing backend, database, and LLM status.
 * Auto-refreshes every 30 seconds. Shows green/red indicators with labels.
 */

import { useState, useEffect, useCallback } from "react";
import type { StatusResponse } from "@/lib/types";

interface ServiceStatus {
    label: string;
    description: string;
    status: "ok" | "error" | "loading";
}

export default function StatusPage() {
    const [statusData, setStatusData] = useState<StatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastChecked, setLastChecked] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/status");
            if (response.ok) {
                const data: StatusResponse = await response.json();
                setStatusData(data);
                setLastChecked(new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.error("Failed to fetch status:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const services: ServiceStatus[] = [
        {
            label: "Backend",
            description: "Next.js API server",
            status: isLoading ? "loading" : statusData ? "ok" : "error",
        },
        {
            label: "Database",
            description: "Supabase PostgreSQL",
            status: isLoading ? "loading" : statusData?.database || "error",
        },
        {
            label: "LLM",
            description: "Google Gemini API",
            status: isLoading ? "loading" : statusData?.llm || "error",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                    System Status
                </h1>
                <p className="text-zinc-400">
                    Health status of all backend services. Auto-refreshes every 30 seconds.
                </p>
            </div>

            {/* Status Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {services.map((service) => (
                    <div
                        key={service.label}
                        className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                    >
                        {/* Background glow based on status */}
                        <div
                            className={`absolute inset-0 opacity-5 ${service.status === "ok"
                                    ? "bg-emerald-500"
                                    : service.status === "error"
                                        ? "bg-red-500"
                                        : "bg-zinc-500"
                                }`}
                        />

                        <div className="relative space-y-3">
                            {/* Status indicator dot */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div
                                        className={`h-3 w-3 rounded-full ${service.status === "ok"
                                                ? "bg-emerald-500"
                                                : service.status === "error"
                                                    ? "bg-red-500"
                                                    : "bg-zinc-500 animate-pulse"
                                            }`}
                                    />
                                    {/* Animated ping for healthy services */}
                                    {service.status === "ok" && (
                                        <div className="absolute inset-0 h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-30" />
                                    )}
                                </div>
                                <span
                                    className={`text-sm font-semibold uppercase tracking-wider ${service.status === "ok"
                                            ? "text-emerald-400"
                                            : service.status === "error"
                                                ? "text-red-400"
                                                : "text-zinc-500"
                                        }`}
                                >
                                    {service.status === "ok"
                                        ? "Healthy"
                                        : service.status === "error"
                                            ? "Error"
                                            : "Checking..."}
                                </span>
                            </div>

                            {/* Service info */}
                            <div>
                                <h3 className="text-lg font-bold text-zinc-100">{service.label}</h3>
                                <p className="text-sm text-zinc-500">{service.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Last checked timestamp */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {lastChecked ? (
                    <span>Last checked at {lastChecked} · Refreshes automatically every 30s</span>
                ) : (
                    <span>Checking service status...</span>
                )}
            </div>

            {/* Manual refresh button */}
            <button
                onClick={() => {
                    setIsLoading(true);
                    fetchStatus();
                }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-4"
            >
                Refresh now
            </button>
        </div>
    );
}
