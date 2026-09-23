"use client";
import Link from "next/link";
import { useState } from "react";
import type { EntityView } from "@/lib/spoilers/conceal";
import { ContentRow } from "@/components/spoilers/spoiler-row";
import { useProgress } from "@/hooks/use-progress";
export function CollectibleList({ items }: { items: EntityView[] }) {
  const { completed, toggle, error, ready } = useProgress();
  const [missing, setMissing] = useState(false);
  const found = items.filter((i) => completed.has(i.id)).length;
  return (
    <>
      <div className="progress-summary">
        <div className="heading-row">
          <div>
            <span className="eyebrow">YOUR DEMO COLLECTION</span>
            <p>
              <strong>{found}</strong>
              <span className="muted"> / {items.length} found</span>
            </p>
          </div>
          <Link href="/gta-6/map?category=collectibles" className="button">
            Open on map
          </Link>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Demo collectibles found"
          aria-valuenow={found}
          aria-valuemin={0}
          aria-valuemax={items.length}
        >
          <span
            style={{
              width: `${items.length ? (found / items.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="toolbar">
        <label className="checkbox-label">
          <input
            checked={missing}
            onChange={(e) => setMissing(e.target.checked)}
            type="checkbox"
          />
          Missing only
        </label>
        <span className="count">Demonstration coast · Sample tokens</span>
      </div>
      {items
        .filter((i) => !missing || !completed.has(i.id))
        .map((e) => (
          <ContentRow entity={e} key={e.id}>
            <button
              className={`button small ${completed.has(e.id) ? "on" : ""}`}
              aria-label={`${completed.has(e.id) ? "Unmark" : "Collect"} ${e.title}`}
              disabled={!ready}
              onClick={() => toggle(e.id, "progress", !completed.has(e.id))}
            >
              {completed.has(e.id) ? "✓ Found" : "Collect"}
            </button>
          </ContentRow>
        ))}
      {missing && found === items.length && (
        <div className="empty-state">
          <h2>All caught up.</h2>
          <p className="muted">Every demo collectible is in your checklist.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </>
  );
}
