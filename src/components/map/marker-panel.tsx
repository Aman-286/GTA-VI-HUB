"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronRight,
  Check,
  Bookmark,
  Eye,
  Flag,
  Share2,
  EyeOff,
  LoaderCircle,
  Route,
} from "lucide-react";
import { labels, entityUrl, type MarkerDetail } from "@/types/content";
import { Badge } from "@/components/ui";

/**
 * The detail view for one marker: a side panel on a desktop, a bottom sheet on
 * a phone (see `.map-detail` in map.css). One component for both, because the
 * content and every action are identical -- only the geometry differs, and
 * duplicating it is how the two drift apart.
 *
 * The fields here used to be hard-coded strings. Anything the database does not
 * know now says so in words rather than guessing: "Not recorded" is a true
 * statement, an invented requirement is not.
 */
export function MarkerPanel({
  marker,
  completed,
  favorite,
  ready,
  error,
  onClose,
  onToggleProgress,
  onToggleFavorite,
  onMarkerState,
  onReveal,
  onShowNearby,
  nearbyActive,
}: {
  marker: MarkerDetail;
  completed: boolean;
  favorite: boolean;
  ready: boolean;
  error: string;
  onClose: () => void;
  onToggleProgress: () => void;
  onToggleFavorite: () => void;
  onMarkerState: (patch: {
    discovered?: boolean;
    visit_later?: boolean;
  }) => Promise<void>;
  onReveal: () => void;
  onShowNearby: () => void;
  nearbyActive: boolean;
}) {
  const [busy, setBusy] = useState("");
  const [shared, setShared] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  /**
   * Selecting a marker moves the reader's attention to this panel; without
   * moving focus with it, a keyboard or screen-reader user stayed on the pin
   * and had to hunt for the panel that had just appeared.
   *
   * Deliberately skipped on the first render. Arriving on a shared marker link
   * is a page load, not a selection: stealing focus there puts a focus ring on
   * a heading nobody asked for and skips past the skip link.
   */
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    // Keyed on the marker rather than a "have I mounted" flag: React's
    // development strict mode runs an effect, tears it down and runs it again,
    // so a mount flag reports the second run as a genuine change and steals
    // focus on the very load this is meant to leave alone.
    if (
      lastFocused.current !== null &&
      lastFocused.current !== marker.marker_id
    )
      heading.current?.focus({ preventScroll: true });
    lastFocused.current = marker.marker_id;
  }, [marker.marker_id]);

  async function setState(patch: {
    discovered?: boolean;
    visit_later?: boolean;
  }) {
    setBusy(Object.keys(patch)[0]);
    await onMarkerState(patch);
    setBusy("");
  }

  async function share() {
    const url = `${window.location.origin}/gta-6/map?marker=${encodeURIComponent(marker.marker_id)}`;
    try {
      // The Web Share sheet is the right control on a phone, but it rejects
      // when the reader dismisses it -- which is not an error worth reporting.
      if (navigator.share) {
        await navigator.share({ title: marker.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("Link copied.");
    } catch {
      setShared(url);
    }
  }

  if (marker.concealed)
    return (
      <aside
        className="map-detail"
        aria-label="Hidden marker"
        role="complementary"
      >
        <span className="map-sheet-grip" aria-hidden="true" />
        <button
          className="icon-button close-detail"
          aria-label="Close marker"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <p className="eyebrow">
          <EyeOff size={13} aria-hidden="true" /> HIDDEN
        </p>
        <h2 tabIndex={-1} ref={heading}>
          {marker.title}
        </h2>
        <p>{marker.spoiler_reason}</p>
        <button className="button primary" onClick={onReveal}>
          Reveal once
        </button>
      </aside>
    );

  const detail: [string, string][] = [
    ["REGION", marker.region_name || "Not recorded"],
    [
      "CATEGORY",
      marker.subcategory_name
        ? `${marker.category_name ?? marker.marker_category} · ${marker.subcategory_name}`
        : (marker.category_name ?? marker.marker_category),
    ],
    [
      "IMAGE COORDINATES",
      `X ${Math.round(marker.x)} · Y ${Math.round(marker.y)}`,
    ],
    ["UNLOCKED BY", marker.unlock_requirements || "Not recorded"],
    ["MARKER STATUS", marker.marker_verification],
    ["CHECKED AGAINST", marker.version_label || "No version recorded"],
    ["LAST CONFIRMED", marker.verified_at || "Never confirmed"],
  ];

  return (
    <aside
      className="map-detail"
      aria-label="Selected marker"
      role="complementary"
    >
      <span className="map-sheet-grip" aria-hidden="true" />
      <button
        className="icon-button close-detail"
        aria-label="Close marker"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <p className="eyebrow">{labels[marker.kind]}</p>
      <h2 tabIndex={-1} ref={heading}>
        {marker.title}
      </h2>
      <Badge entity={marker} />
      {marker.contributed === 1 && (
        <span className="badge neutral">Reader submitted</span>
      )}
      <p>{marker.description}</p>
      {marker.notes && <p className="muted map-detail-note">{marker.notes}</p>}

      <dl>
        {detail.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="map-detail-actions">
        <Link className="button primary" href={entityUrl(marker)}>
          View details
          <ChevronRight size={16} />
        </Link>
        <button
          className={`button ${completed ? "on" : ""}`}
          disabled={!ready}
          onClick={onToggleProgress}
          aria-pressed={completed}
        >
          <Check size={15} aria-hidden="true" />
          {completed ? "Completed" : "Mark complete"}
        </button>
        <button
          className={`button ${marker.discovered ? "on" : ""}`}
          disabled={!ready || busy === "discovered"}
          onClick={() => void setState({ discovered: !marker.discovered })}
          aria-pressed={marker.discovered}
        >
          {busy === "discovered" ? (
            <LoaderCircle size={15} className="spin" aria-hidden="true" />
          ) : (
            <Eye size={15} aria-hidden="true" />
          )}
          {marker.discovered ? "Discovered" : "Mark discovered"}
        </button>
        <button
          className={`button ${marker.visit_later ? "on" : ""}`}
          disabled={!ready || busy === "visit_later"}
          onClick={() => void setState({ visit_later: !marker.visit_later })}
          aria-pressed={marker.visit_later}
        >
          {busy === "visit_later" ? (
            <LoaderCircle size={15} className="spin" aria-hidden="true" />
          ) : (
            <Route size={15} aria-hidden="true" />
          )}
          {marker.visit_later ? "On your list" : "Visit later"}
        </button>
        <button
          className={`button ${favorite ? "on" : ""}`}
          disabled={!ready}
          onClick={onToggleFavorite}
          aria-pressed={favorite}
        >
          <Bookmark size={15} aria-hidden="true" />
          {favorite ? "Saved" : "Add to favourites"}
        </button>
        <button
          className={`button ${nearbyActive ? "on" : ""}`}
          onClick={onShowNearby}
          aria-pressed={nearbyActive}
        >
          {nearbyActive ? "Showing nearby" : "Show only nearby"}
        </button>
        <button className="button" onClick={() => void share()}>
          <Share2 size={15} aria-hidden="true" />
          Share
        </button>
        <Link
          className="button"
          href={`/submit?title=${encodeURIComponent(`Correction: ${marker.title}`)}`}
        >
          <Flag size={15} aria-hidden="true" />
          Report a problem
        </Link>
      </div>

      {shared && (
        <p className="muted map-detail-note" role="status">
          {shared}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </aside>
  );
}
