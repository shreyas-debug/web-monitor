/**
 * links.schema.ts — Zod validation schemas for the links API.
 *
 * Used in controllers to validate incoming request bodies at runtime.
 * Type inference means we never need to write separate TypeScript interfaces
 * for request shapes — the schema IS the type.
 */

import { z } from "zod";
import { DEFAULT_PROJECT_NAME } from "@/lib/constants";

/** Schema for POST /api/links — adding a new monitored URL */
export const AddLinkSchema = z.object({
    url: z
        .string({ error: "URL is required" })
        .min(1, "URL cannot be empty"),
    project_name: z
        .string()
        .optional()
        .default(DEFAULT_PROJECT_NAME),
});

export type AddLinkInput = z.infer<typeof AddLinkSchema>;
