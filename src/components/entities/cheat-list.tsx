"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, Badge } from "@/components/ui";
import type { Entity } from "@/types/content";
const platforms = ["PS5", "Xbox"];
export function CheatList({
  items,
}: {
  items: (Entity & {
    platform: string;
    code: string;
    effect: string;
    warning: string;
  })[];
}) {
  const [platform, setPlatform] = useState("PS5"),
    [copied, setCopied] = useState("");
  // Let the confirmation fade back to "Copy" so the button stops claiming a
  // stale result once the user has moved on.
  useEffect(() => {
    if (!copied || copied === "failed") return;
    const t = setTimeout(() => setCopied(""), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const shown = items.filter(
    (i) => i.platform === platform || i.platform === "Phone",
  );
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Cheat platform">
        {platforms.map((p) => (
          <button
            key={p}
            id={`cheat-tab-${p}`}
            role="tab"
            type="button"
            aria-selected={p === platform}
            aria-controls="cheat-panel"
            className={p === platform ? "active" : ""}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div
        key={platform}
        id="cheat-panel"
        className="tab-panel"
        role="tabpanel"
        aria-labelledby={`cheat-tab-${platform}`}
        tabIndex={-1}
      >
        {shown.length ? (
          shown.map((i) => (
            <div key={i.id + i.platform} className="entity-row cheat-row">
              <div className="entity-row-main">
                <h3 className="row-title">
                  {i.title} <Badge entity={i} />
                </h3>
                <p className="row-description muted">{i.effect}</p>
                <code className="cheat-code">{i.code}</code>
                {i.warning && <p className="cheat-warning">{i.warning}</p>}
              </div>
              <button
                className="button"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(i.code);
                    setCopied(i.id);
                  } catch {
                    setCopied("failed");
                  }
                }}
              >
                {copied === i.id ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ))
        ) : (
          <EmptyState title="No verified codes in the database yet.">
            <p>
              We won’t invent button combinations or phone numbers. Codes will
              appear here after an editor reviews supporting evidence.
            </p>
            <Link className="button" href="/submit">
              Have a source? Submit it
            </Link>
          </EmptyState>
        )}
      </div>
      {copied === "failed" && (
        <p role="alert" className="notice error">
          Copy failed. Select the code and copy it manually.
        </p>
      )}
    </>
  );
}
