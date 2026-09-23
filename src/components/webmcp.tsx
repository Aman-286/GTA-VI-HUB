"use client";
import { useEffect } from "react";
import { z } from "zod";
import { guestSession } from "@/hooks/use-progress";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};
export function CompanionTools() {
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    const tools: Tool[] = [
      {
        name: "search_companion",
        description:
          "Search published companion records. Demo results are explicitly labeled and are not game facts.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 2, maxLength: 120 },
          },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          const { query } = z
            .object({ query: z.string().min(2).max(120) })
            .strict()
            .parse(input);
          const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          return data;
        },
      },
      {
        name: "set_companion_completion",
        description:
          "Set a published record as complete or incomplete on the current visitor’s companion checklist. Does not change a game save.",
        inputSchema: {
          type: "object",
          properties: {
            entity_id: { type: "string" },
            completed: { type: "boolean" },
          },
          required: ["entity_id", "completed"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const data = z
            .object({ entity_id: z.string().max(100), completed: z.boolean() })
            .strict()
            .parse(input);
          await guestSession();
          const r = await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity_id: data.entity_id,
              type: "progress",
              value: data.completed,
            }),
          });
          const result = await r.json();
          if (!r.ok) throw Error(result.error);
          window.dispatchEvent(new Event("hub-progress"));
          return { entity_id: data.entity_id, completed: data.completed };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => controller.abort();
  }, []);
  return null;
}
