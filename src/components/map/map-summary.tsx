"use client";
import { useCallback, useEffect, useState } from "react";

interface CategoryProgress {
  category: string;
  name: string;
  total: number;
  completed: number;
  saved: number;
}
interface Summary {
  signed_in: boolean;
  overall: { total: number; completed: number; saved: number };
  categories: CategoryProgress[];
}

/**
 * Completion per marker category, counted in the database against the same
 * spoiler predicate the map draws with.
 *
 * Categories with no markers are shown as "None yet" rather than 0 / 0 or
 * omitted: an empty category is a true statement about the database, and
 * hiding it would make the map look more complete than it is. No denominator
 * here is invented.
 */
export function MapSummary({
  onPick,
  active,
}: {
  onPick: (category: string) => void;
  active: string;
}) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/map/summary");
      if (!r.ok) throw Error("Could not load your progress summary.");
      setData((await r.json()) as Summary);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    // Marking something complete anywhere on the page changes these numbers.
    const listener = () => void load();
    window.addEventListener("hub-progress", listener);
    window.addEventListener("hub-spoilers", listener);
    return () => {
      window.removeEventListener("hub-progress", listener);
      window.removeEventListener("hub-spoilers", listener);
    };
  }, [load]);

  if (error)
    return (
      <p className="notice error" role="alert">
        {error}
      </p>
    );
  if (!data)
    return (
      <div className="map-summary" aria-busy="true">
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );

  const { overall } = data;
  const withMarkers = data.categories.filter((c) => c.total > 0);
  const empty = data.categories.length - withMarkers.length;

  return (
    <div className="map-summary">
      <div className="map-summary-total">
        <span className="eyebrow">YOUR PROGRESS</span>
        <p>
          <strong>{overall.completed}</strong>
          <span className="muted"> / {overall.total} markers completed</span>
        </p>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Markers completed"
          aria-valuenow={overall.completed}
          aria-valuemin={0}
          aria-valuemax={overall.total}
        >
          <span
            style={{
              width: `${overall.total ? (overall.completed / overall.total) * 100 : 0}%`,
            }}
          />
        </div>
        {overall.saved > 0 && (
          <p className="muted map-summary-saved">
            {overall.saved} saved to visit later.
          </p>
        )}
      </div>
      <ul className="map-summary-list">
        {withMarkers.map((c) => (
          <li key={c.category}>
            <button
              className={active === c.category ? "active" : ""}
              onClick={() => onPick(c.category)}
              aria-pressed={active === c.category}
            >
              <span className="map-summary-name">{c.name}</span>
              <span className="map-summary-count">
                {c.completed}
                <span className="muted"> / {c.total}</span>
              </span>
              <span
                className="progress-track small"
                role="progressbar"
                aria-label={`${c.name} completed`}
                aria-valuenow={c.completed}
                aria-valuemin={0}
                aria-valuemax={c.total}
              >
                <span style={{ width: `${(c.completed / c.total) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {empty > 0 && (
        <p className="muted map-summary-empty">
          {empty} more {empty === 1 ? "category is" : "categories are"} set up
          but have no markers yet.
        </p>
      )}
      {!data.signed_in && (
        <p className="muted map-summary-empty">
          Mark something to start a checklist. It follows you into an account
          when you make one.
        </p>
      )}
    </div>
  );
}
