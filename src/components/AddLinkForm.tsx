"use client";

/**
 * AddLinkForm — Input form for adding a new URL to monitor.
 * Validates URL format client-side and displays inline error messages.
 * Disables submit while request is in-flight.
 */

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddLinkFormProps {
    onLinkAdded: () => void;
    currentLinkCount: number;
}

export function AddLinkForm({ onLinkAdded, currentLinkCount }: AddLinkFormProps) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /** Client-side URL validation before hitting the API */
    function validateUrl(input: string): string | null {
        if (!input.trim()) return "Please enter a URL";
        try {
            const parsed = new URL(input);
            if (!["http:", "https:"].includes(parsed.protocol)) {
                return "URL must start with http:// or https://";
            }
        } catch {
            return "Please enter a valid URL (e.g. https://example.com)";
        }
        if (currentLinkCount >= 8) {
            return "Maximum of 8 links reached. Remove one to add another.";
        }
        return null;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const validationError = validateUrl(url);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to add link");
                return;
            }

            setUrl("");
            onLinkAdded();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
                <Input
                    type="text"
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        if (error) setError(null);
                    }}
                    placeholder="https://example.com/pricing"
                    className="flex-1 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-indigo-500/20"
                    disabled={isSubmitting}
                    aria-label="URL to monitor"
                />
                <Button
                    type="submit"
                    disabled={isSubmitting || currentLinkCount >= 8}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Adding...
                        </span>
                    ) : (
                        "Add URL"
                    )}
                </Button>
            </div>

            {/* Inline error message */}
            {error && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {error}
                </p>
            )}

            {/* Link count indicator */}
            <p className="text-xs text-zinc-500">
                {currentLinkCount}/8 URLs monitored
            </p>
        </form>
    );
}
