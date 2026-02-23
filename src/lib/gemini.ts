/**
 * Google Gemini AI client wrapper.
 * Provides a typed helper for summarizing webpage changes using gemini-2.0-flash.
 * Server-side only — the API key must never reach the client.
 *
 * Uses lazy initialization to avoid env var validation during build time.
 */

import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { env } from "./env";
import type { DiffSummary } from "./types";

/** Lazily initialized Gemini client */
let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!_genAI) {
        _genAI = new GoogleGenerativeAI(env.geminiApiKey);
    }
    return _genAI;
}

/** Response schema for structured Gemini output */
const diffSummarySchema: ResponseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.STRING,
            description: "A 2-3 sentence summary of what changed on the webpage",
        },
        citations: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description:
                "Up to 5 exact quotes from the NEW content that best illustrate the changes",
        },
    },
    required: ["summary", "citations"],
};

/**
 * Summarize the changes between two versions of a webpage using Gemini.
 *
 * @param oldContent - The previous version of the page's readable text
 * @param newContent - The current version of the page's readable text
 * @returns Structured summary with citations, or null if the call fails
 */
export async function summarizeChanges(
    oldContent: string,
    newContent: string
): Promise<DiffSummary | null> {
    try {
        const model = getGenAI().getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: diffSummarySchema,
            },
        });

        const prompt = `You are analyzing changes to a webpage. Below is the PREVIOUS version and the NEW version of the page content.

PREVIOUS VERSION:
---
${oldContent.slice(0, 8000)}
---

NEW VERSION:
---
${newContent.slice(0, 8000)}
---

Summarize what changed in 2-3 sentences. Then list up to 5 exact quotes from the NEW content that best illustrate the changes.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed: DiffSummary = JSON.parse(text);

        return parsed;
    } catch (error) {
        console.error("[Gemini] Failed to summarize changes:", error);
        return null;
    }
}

/**
 * Minimal health check for the Gemini API connection.
 * Uses a lightweight models.list API call instead of generateContent
 * to avoid burning quota and hitting 429 rate limits on the free tier.
 *
 * @returns true if healthy, false otherwise
 */
export async function checkGeminiHealth(): Promise<boolean> {
  try {
    // Use a lightweight fetch to the models endpoint instead of generating content.
    // This avoids consuming quota and triggering 429 errors on the free tier.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${env.geminiApiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    return response.ok;
  } catch (error) {
    console.error("[Gemini] Health check failed:", error);
    return false;
  }
}
