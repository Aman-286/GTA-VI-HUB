"use client";
import { Check, Bookmark, Share2 } from "lucide-react";
import { useState } from "react";
import { useProgress } from "@/hooks/use-progress";
export function EntityActions({ id }: { id: string }) {
  const { completed, favorites, toggle, error, ready } = useProgress();
  const [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function change(type: "progress" | "favorite", value: boolean) {
    setBusy(true);
    await toggle(id, type, value);
    setBusy(false);
  }
  return (
    <>
      <div className="entity-actions">
        <button
          disabled={!ready || busy}
          className={`button ${completed.has(id) ? "on" : ""}`}
          onClick={() => change("progress", !completed.has(id))}
        >
          <Check size={16} />
          {completed.has(id) ? "Completed" : "Mark complete"}
        </button>
        <button
          disabled={!ready || busy}
          className={`button ${favorites.has(id) ? "on" : ""}`}
          onClick={() => change("favorite", !favorites.has(id))}
        >
          <Bookmark
            size={16}
            fill={favorites.has(id) ? "currentColor" : "none"}
          />
          {favorites.has(id) ? "Saved" : "Save"}
        </button>
        <button
          className="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Share2 size={16} />
          {copied ? "Link copied" : "Share"}
        </button>
      </div>
      {error && (
        <p role="alert" className="form-message">
          {error}
        </p>
      )}
    </>
  );
}
