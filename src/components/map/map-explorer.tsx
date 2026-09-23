"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  ChevronRight,
  MapPin,
  LayoutGrid,
  EyeOff,
  ShoppingBag,
  Zap,
  Shield,
  Cross,
  Bird,
  MoveUpRight,
  DoorOpen,
  Navigation,
  Users,
  ListFilter,
} from "lucide-react";
import {
  Marker,
  MarkerDetail,
  MarkerCategory,
  Region,
  Kind,
} from "@/types/content";
import { icons } from "@/components/ui";
import { useProgress, guestSession } from "@/hooks/use-progress";
import {
  filterParams,
  parseFilters,
  hasFilters,
  type MapFilters,
} from "@/lib/map/viewport";
import { MarkerPanel } from "./marker-panel";
import { MapSummary } from "./map-summary";
import { openSpoilerSettings } from "@/components/spoilers/spoiler-settings";

const Canvas = dynamic(() => import("./map-canvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="map-loading">Opening the map…</div>,
});

/**
 * Categories that mirror a record type reuse that type's icon so the map and
 * the database read as one system; the kinds of place that exist only on the
 * map get their own. Lucide glyphs throughout -- an emoji would not inherit
 * the colour, would not scale with the type, and reads differently on every
 * platform.
 */
const extraIcons: Record<string, typeof ListFilter> = {
  services: ShoppingBag,
  "random-events": Zap,
  police: Shield,
  hospitals: Cross,
  wildlife: Bird,
  "stunt-jumps": MoveUpRight,
  interiors: DoorOpen,
  "fast-travel": Navigation,
  community: Users,
};
const iconFor = (id: string) =>
  icons[id as Kind] ?? extraIcons[id] ?? ListFilter;

export function MapExplorer({
  categories,
  regions,
}: {
  categories: MarkerCategory[];
  regions: Region[];
}) {
  const params = useSearchParams();
  const markerId = params.get("marker") || "";
  // Derived from the URL on every render rather than mirrored into state: the
  // address bar is the single source of truth for what the map is showing, so
  // a shared link and a click produce exactly the same view.
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(params.toString())),
    [params],
  );

  const [selected, setSelected] = useState<MarkerDetail | null>(null),
    [visible, setVisible] = useState<Marker[]>([]),
    [focusTarget, setFocusTarget] = useState<Marker | null>(null),
    [selectionError, setSelectionError] = useState(""),
    [hiddenCount, setHiddenCount] = useState(0),
    [panelOpen, setPanelOpen] = useState(false),
    [reset, setReset] = useState(0),
    [filtersOpen, setFiltersOpen] = useState(false),
    [stateError, setStateError] = useState(""),
    [query, setQuery] = useState("");

  const { completed, favorites, toggle, error, ready, guest } = useProgress();

  useEffect(() => {
    const refresh = () => {
      setSelected(null);
      setVisible([]);
      setFocusTarget(null);
      setReset((value) => value + 1);
    };
    window.addEventListener("hub-spoilers", refresh);
    return () => window.removeEventListener("hub-spoilers", refresh);
  }, []);

  const topLevel = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories],
  );
  const subcategories = useMemo(
    () => categories.filter((c) => c.parent_id === filters.category),
    [categories, filters.category],
  );

  /**
   * Map state lives in the address bar, but changing it must never trigger a
   * server navigation -- that would tear down and re-create the Leaflet canvas
   * and lose the reader's position. `replaceState` updates the URL in place and
   * Next's `useSearchParams` observes it.
   */
  const apply = useCallback(
    (next: Partial<MapFilters>, marker = markerId) => {
      const merged = { ...filters, ...next };
      const qs = filterParams(merged);
      if (marker) qs.set("marker", marker);
      window.history.replaceState(
        null,
        "",
        `/gta-6/map${qs.size ? "?" + qs : ""}`,
      );
    },
    [filters, markerId],
  );

  const select = useCallback(
    (m: Marker) => {
      setSelectionError("");
      setPanelOpen(true);
      setFiltersOpen(false);
      setFocusTarget({ ...m });
      if (markerId !== m.marker_id) apply({}, m.marker_id);
    },
    [apply, markerId],
  );

  const closeMarker = useCallback(() => {
    setSelected(null);
    setPanelOpen(false);
    const qs = filterParams(filters);
    window.history.replaceState(
      null,
      "",
      `/gta-6/map${qs.size ? "?" + qs : ""}`,
    );
  }, [filters]);

  // Resolve the selected marker's full detail. The viewport response carries
  // only enough to draw a pin; everything the panel states comes from here.
  const loadMarker = useCallback(async (id: string, signal?: AbortSignal) => {
    const r = await fetch(`/api/map?marker=${encodeURIComponent(id)}`, {
      signal,
    });
    if (!r.ok) throw Error("Could not open this marker.");
    const data = (await r.json()) as { marker: MarkerDetail | null };
    if (!data.marker) throw Error("This marker is no longer available.");
    return data.marker;
  }, []);

  useEffect(() => {
    if (!markerId) {
      setSelected(null);
      setPanelOpen(false);
      return;
    }
    if (selected?.marker_id === markerId) return;
    const c = new AbortController();
    setSelectionError("");
    void loadMarker(markerId, c.signal)
      .then((m) => {
        if (c.signal.aborted) return;
        setSelected(m);
        setPanelOpen(true);
        setFocusTarget(m.concealed ? null : m);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setSelected(null);
          setSelectionError((e as Error).message);
        }
      });
    return () => c.abort();
  }, [markerId, selected?.marker_id, loadMarker, reset]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (filtersOpen) setFiltersOpen(false);
      else if (panelOpen) closeMarker();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panelOpen, closeMarker, filtersOpen]);

  async function markerState(patch: {
    discovered?: boolean;
    visit_later?: boolean;
  }) {
    if (!selected) return;
    setStateError("");
    // Moved in the interface first. These are checkbox-like toggles a reader
    // expects to answer the press, and the round trip is long enough to read
    // as a dead control.
    const previous = selected;
    setSelected({ ...selected, ...patch });
    const send = () =>
      fetch("/api/map/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marker_id: selected.marker_id, ...patch }),
      });
    try {
      // A write is the first moment a reader needs an identity, so the guest
      // session is minted here rather than discovered by provoking a 401 --
      // which the browser reports as a red console error on the reader's very
      // first interaction with the map.
      if (guest) await guestSession();
      let r = await send();
      if (r.status === 401) {
        await guestSession();
        r = await send();
      }
      if (!r.ok)
        throw Error(
          (await r.json().catch(() => ({}))).error ||
            "Your change was not saved.",
        );
      // The "visit later" filter and the summary both read this.
      window.dispatchEvent(new Event("hub-progress"));
    } catch (e) {
      setSelected(previous);
      setStateError((e as Error).message);
    }
  }

  async function revealMarker() {
    if (!selected) return;
    try {
      const r = await fetch(
        `/api/map?marker=${encodeURIComponent(selected.marker_id)}&reveal=${encodeURIComponent(selected.reveal_token || "")}`,
      );
      if (!r.ok) throw Error("Could not open this marker.");
      const data = (await r.json()) as { marker: MarkerDetail | null };
      const found = data.marker;
      if (!found) throw Error("This marker is no longer available.");
      setSelected(found);
      setFocusTarget(found);
    } catch (e) {
      setStateError((e as Error).message);
    }
  }

  const clearAll = () => {
    setSelected(null);
    setPanelOpen(false);
    setFocusTarget(null);
    setQuery("");
    setReset((r) => r + 1);
    window.history.replaceState(null, "", "/gta-6/map");
  };

  const directory = visible.filter((v) =>
    v.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="map-page">
      <div className="map-titlebar">
        <div>
          <MapPin size={19} />
          <h1>Interactive map</h1>
          <span className="badge demo">DEMO WORLD</span>
        </div>
        {hasFilters(filters) && (
          <span className="map-filter-count">
            {filterParams(filters).size} active
          </span>
        )}
        <button
          className="button small map-filters-toggle"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="map-filters"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
        <button
          className="icon-button"
          onClick={clearAll}
          aria-label="Reset the map and clear all filters"
        >
          <RotateCcw size={17} />
        </button>
      </div>

      <div className={`map-workspace ${panelOpen ? "has-selection" : ""}`}>
        <aside
          className={`map-sidebar ${filtersOpen ? "open" : ""}`}
          id="map-filters"
          aria-label="Map filters"
        >
          <div className="map-sidebar-heading">
            <span className="eyebrow">EXPLORE BY CATEGORY</span>
            <button
              className="icon-button"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a visible marker…"
            aria-label="Search visible map markers"
          />

          <button
            className={`map-filter ${!filters.category ? "active" : ""}`}
            onClick={() => apply({ category: "", subcategory: "" }, "")}
          >
            <LayoutGrid size={17} />
            All discoveries
            <ChevronRight size={15} />
          </button>
          {topLevel.map((c) => {
            const Icon = iconFor(c.id);
            const open = filters.category === c.id;
            return (
              <div key={c.id}>
                <button
                  className={`map-filter ${open ? "active" : ""}`}
                  onClick={() => apply({ category: c.id, subcategory: "" }, "")}
                  title={c.description}
                  aria-expanded={
                    subcategories.length > 0 && open ? true : undefined
                  }
                >
                  <Icon size={17} />
                  {c.name}
                  <ChevronRight size={14} />
                </button>
                {/* Rendered inside the category it belongs to. Collected at the
                    bottom of the list instead, the chips sat a dozen rows away
                    from the thing they narrowed. */}
                {open && subcategories.length > 0 && (
                  <div className="map-subfilters">
                    <span className="eyebrow">NARROW IT DOWN</span>
                    <button
                      className={`map-subfilter ${!filters.subcategory ? "active" : ""}`}
                      onClick={() => apply({ subcategory: "" }, "")}
                    >
                      Everything
                    </button>
                    {subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        className={`map-subfilter ${filters.subcategory === sub.id ? "active" : ""}`}
                        onClick={() => apply({ subcategory: sub.id }, "")}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <label className="map-select">
            Region
            <select
              value={filters.region}
              onChange={(e) => apply({ region: e.target.value }, "")}
            >
              <option value="">Anywhere on the map</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.hideCompleted}
              onChange={(e) => apply({ hideCompleted: e.target.checked })}
            />
            Hide completed
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.visitLater}
              onChange={(e) => apply({ visitLater: e.target.checked })}
            />
            Only my “visit later” list
          </label>
          {filters.near && (
            <button
              className="button small"
              onClick={() => apply({ near: "" })}
            >
              Stop showing only nearby
            </button>
          )}

          {hiddenCount > 0 && (
            <p
              className="notice spoiler-notice map-hidden-notice"
              role="status"
            >
              <EyeOff size={14} aria-hidden="true" />
              <span>
                {hiddenCount} {hiddenCount === 1 ? "marker is" : "markers are"}{" "}
                hidden by your spoiler setting.
              </span>
              <button
                type="button"
                className="text-link"
                onClick={openSpoilerSettings}
              >
                Change
              </button>
            </p>
          )}

          <MapSummary
            active={filters.category}
            onPick={(category) =>
              apply(
                {
                  category: filters.category === category ? "" : category,
                  subcategory: "",
                },
                "",
              )
            }
          />

          <p className="map-legend">
            Icons identify categories. A check marks completed discoveries.
            <br />
            Numbered groups reveal nearby markers when you zoom in.
          </p>

          <details className="marker-directory" open={query ? true : undefined}>
            <summary>
              {directory.length} visible{" "}
              {directory.length === 1 ? "marker" : "markers"} · Text list
            </summary>
            <p className="muted map-directory-hint">
              The same markers as the map, for reading and keyboard use.
            </p>
            {directory.map((m) => (
              <button key={m.marker_id} onClick={() => select(m)}>
                {m.title}
                {!!m.is_demo && <span className="badge demo">DEMO</span>}
              </button>
            ))}
            {!directory.length && (
              <p>No markers here. Change your filters or zoom out.</p>
            )}
          </details>
        </aside>

        <div className="map-stage">
          <Canvas
            filters={filters}
            selected={markerId}
            onSelect={select}
            onVisible={setVisible}
            onHidden={setHiddenCount}
            completed={completed}
            resetKey={reset}
            focusTarget={focusTarget}
          />
          {selectionError && (
            <div className="map-error" role="alert">
              {selectionError}
              <button
                className="button small"
                onClick={() => {
                  setSelectionError("");
                  apply({}, "");
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="map-disclaimer">
            Fictional demonstration map. Not GTA VI geography.
          </div>
          <div className="map-compass" aria-hidden="true">
            N<span>↑</span>
          </div>
        </div>

        {selected && panelOpen && selected.marker_id === markerId && (
          <MarkerPanel
            marker={selected}
            completed={completed.has(selected.id)}
            favorite={favorites.has(selected.id)}
            ready={ready}
            error={stateError || error}
            onClose={closeMarker}
            onToggleProgress={() =>
              void toggle(selected.id, "progress", !completed.has(selected.id))
            }
            onToggleFavorite={() =>
              void toggle(selected.id, "favorite", !favorites.has(selected.id))
            }
            onMarkerState={markerState}
            onReveal={revealMarker}
            nearbyActive={filters.near === selected.marker_id}
            onShowNearby={() =>
              apply({
                near:
                  filters.near === selected.marker_id ? "" : selected.marker_id,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
