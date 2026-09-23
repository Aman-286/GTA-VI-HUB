import { z } from "zod";
import { kinds, verifications } from "@/types/content";
export const safeUrl = z
  .url()
  .max(1000)
  .refine((s) => {
    const u = new URL(s);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  }, "Use an HTTP or HTTPS source URL");
export const entityInput = z.object({
  id: z.string().optional(),
  kind: z.enum(kinds),
  title: z.string().trim().min(3).max(140),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  description: z.string().trim().min(20).max(500),
  body: z.string().max(30000).default(""),
  category: z.string().max(80).default(""),
  verification: z.enum(verifications).default("Unverified"),
  is_demo: z.coerce.number().int().min(0).max(1),
  status: z.enum(["draft", "published", "archived"]),
  revision: z.number().int().positive().optional(),
  source_id: z.string().optional(),
  fact: z.string().max(1000).optional(),
  seo_title: z.string().max(160).optional(),
  meta_description: z.string().max(320).optional(),
  /**
   * Spoiler classification. `reveal_after_sequence` is a mission position, not
   * a free number: the reading side compares it against the reader's stored
   * story position, which the server derives from a mission they picked.
   */
  spoiler_level: z.coerce.number().int().min(0).max(2).default(0),
  spoiler_category: z
    .string()
    .regex(/^[a-z-]*$/, "Use a lowercase category id")
    .max(40)
    .default(""),
  reveal_after_sequence: z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .nullable()
    .optional(),
  safe_title: z.string().max(140).optional(),
  safe_description: z.string().max(500).optional(),
});
export function publicationError(
  data: {
    is_demo: number;
    verification: string;
    status: string;
    body: string;
    description: string;
    spoiler_level?: number;
    spoiler_category?: string;
  },
  sourceCount: number,
) {
  if (
    data.is_demo &&
    ["Official", "Verified", "Community Verified"].includes(data.verification)
  )
    return "Demo content cannot be marked verified.";
  if (
    ["Official", "Verified", "Community Verified"].includes(
      data.verification,
    ) &&
    !sourceCount
  )
    return "Attach a source and the fact it supports before verifying.";
  if (data.status === "published" && data.body.trim().length < 80)
    return "Published content needs at least 80 characters of useful body content.";
  // A classified record without a category can be hidden but never selectively
  // revealed: "Always show endings" has nothing to match on. Requiring the
  // category at publication keeps that control honest.
  if (
    data.status === "published" &&
    Number(data.spoiler_level) > 0 &&
    !String(data.spoiler_category || "").trim()
  )
    return "Choose a spoiler category so readers can opt in to this kind of content.";
  return null;
}
export const submissionInput = z.object({
  kind: z.enum(kinds),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(5000),
  url: safeUrl,
  turnstileToken: z.string().max(2048).optional(),
  website: z.string().max(0).optional(),
});
