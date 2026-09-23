import type * as Leaflet from "leaflet";
import type { Marker as RecordMarker } from "@/types/content";
import {
  LatestRequest,
  MAP_HEIGHT,
  MAP_WIDTH,
  minimumZoom,
  viewportQuery,
  type MapFilters,
} from "./viewport";
type Cluster = { cluster_id: string; x: number; y: number; count: number };
type Payload = {
  map: { image_url: string };
  markers: RecordMarker[];
  clusters: Cluster[];
  truncated: boolean;
  hidden?: number;
};
export type MapOptions = {
  filters: MapFilters;
  selected: string;
  completed: Set<string>;
  onSelect: (marker: RecordMarker) => void;
  onVisible: (markers: RecordMarker[]) => void;
  /** How many markers the spoiler setting withheld from this response. */
  onHidden?: (count: number) => void;
  onStatus: (status: {
    loading?: boolean;
    error?: string;
    hint?: string;
  }) => void;
};
// Static icon paths only. User-provided text never enters marker HTML.
const paths: Record<string, string> = {
  missions: "M4 22V2m0 1c5-4 10 4 16 0v12c-6 4-11-4-16 0",
  vehicles: "m5 17-1 3m15-3 1 3M4 9l2-5h12l2 5M3 9h18v8H3zM6 13h2m8 0h2",
  weapons: "M12 2v4m0 12v4M2 12h4m12 0h4M5 12a7 7 0 1 0 14 0 7 7 0 1 0-14 0",
  collectibles: "m12 3 9 9-9 9-9-9z",
  locations:
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  default: "M12 3v18M3 12h18",
  done: "m4 12 5 5L20 6",
};
const glyph = (category: string, done: boolean) =>
  `<span class="map-pin-glyph"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[done ? "done" : category] || paths.default}"/></svg></span>`;
export function createMapController(
  root: HTMLDivElement,
  L: typeof Leaflet,
  initial: MapOptions,
) {
  let options = initial,
    disposed = false,
    interacting = false,
    imageReady = false,
    imageFailed = false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const requests = new LatestRequest();
  const pins = new Map<
    string,
    { layer: Leaflet.Marker; record: RecordMarker; style: string }
  >();
  const clusters = new Map<string, { layer: Leaflet.Marker; count: number }>();
  let timer: ReturnType<typeof setTimeout> | undefined,
    resizeFrame = 0,
    overlay: Leaflet.ImageOverlay | undefined;
  let pending: Payload | undefined, lastData: Payload | undefined;
  const bounds = L.latLngBounds([
    [0, 0],
    [MAP_HEIGHT, MAP_WIDTH],
  ]);
  const map = L.map(root, {
    crs: L.CRS.Simple,
    minZoom: minimumZoom(root.clientWidth, root.clientHeight),
    maxZoom: 3,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 100,
    wheelDebounceTime: 80,
    zoomControl: false,
    attributionControl: false,
    maxBounds: bounds.pad(0.2),
    maxBoundsViscosity: 0.85,
    inertia: !reduced.matches,
    inertiaDeceleration: 2500,
    zoomAnimation: !reduced.matches,
    fadeAnimation: !reduced.matches,
    markerZoomAnimation: !reduced.matches,
    bounceAtZoomLimits: false,
  });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  function fit() {
    map.stop();
    map.setMinZoom(minimumZoom(root.clientWidth, root.clientHeight));
    map.fitBounds(bounds, { padding: [12, 12], animate: false });
  }
  fit();
  function stylePins() {
    for (const { layer, record } of pins.values()) {
      const element = layer.getElement();
      if (!element) continue;
      element.classList.toggle(
        "selected",
        options.selected === record.marker_id,
      );
      element.classList.toggle("done", options.completed.has(record.id));
      element.setAttribute(
        "aria-label",
        `${record.title}${options.completed.has(record.id) ? ", completed" : ""}${options.selected === record.marker_id ? ", selected" : ""}`,
      );
      element.setAttribute(
        "aria-pressed",
        String(options.selected === record.marker_id),
      );
      layer.setZIndexOffset(options.selected === record.marker_id ? 1000 : 0);
    }
  }
  function reconcile(data: Payload) {
    if (disposed) return;
    lastData = data;
    const visible = data.markers.filter(
      (v) => !options.filters.hideCompleted || !options.completed.has(v.id),
    );
    const keep = new Set(visible.map((v) => v.marker_id));
    for (const [id, pin] of pins) {
      if (!keep.has(id)) {
        layer.removeLayer(pin.layer);
        pins.delete(id);
      }
    }
    for (const record of visible) {
      const done = options.completed.has(record.id),
        style = `${record.marker_category}:${done}`;
      const icon = () =>
        L.divIcon({
          className: "hub-map-pin",
          html: glyph(record.marker_category, done),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      const existing = pins.get(record.marker_id);
      if (existing) {
        existing.record = record;
        if (existing.style !== style) {
          existing.layer.setIcon(icon());
          existing.style = style;
        }
        const position = existing.layer.getLatLng();
        if (position.lat !== MAP_HEIGHT - record.y || position.lng !== record.x)
          existing.layer.setLatLng([MAP_HEIGHT - record.y, record.x]);
      } else {
        const marker = L.marker([MAP_HEIGHT - record.y, record.x], {
          title: record.title,
          keyboard: true,
          autoPanOnFocus: false,
          riseOnHover: true,
          icon: icon(),
        });
        marker.on("click", () => {
          const current = pins.get(record.marker_id)?.record;
          if (current) options.onSelect(current);
        });
        marker.addTo(layer);
        pins.set(record.marker_id, { layer: marker, record, style });
      }
    }
    const keepClusters = new Set(data.clusters.map((c) => c.cluster_id));
    for (const [id, cluster] of clusters) {
      if (!keepClusters.has(id)) {
        layer.removeLayer(cluster.layer);
        clusters.delete(id);
      }
    }
    for (const cluster of data.clusters) {
      const existing = clusters.get(cluster.cluster_id);
      if (existing) {
        existing.layer.setLatLng([MAP_HEIGHT - cluster.y, cluster.x]);
        if (existing.count !== cluster.count) {
          const el = existing.layer.getElement();
          if (el) {
            // Write into the counter span, not the icon root. Setting
            // textContent on the root replaced the span with a bare text node,
            // discarding the element the badge is actually drawn on.
            const label = el.querySelector("span");
            if (label) label.textContent = String(cluster.count);
            else el.textContent = String(cluster.count);
            el.setAttribute(
              "title",
              `${cluster.count} nearby markers. Zoom in.`,
            );
            el.setAttribute(
              "aria-label",
              `${cluster.count} nearby markers. Zoom in.`,
            );
          }
          existing.count = cluster.count;
        }
        continue;
      }
      const marker = L.marker([MAP_HEIGHT - cluster.y, cluster.x], {
        title: `${cluster.count} nearby markers. Zoom in.`,
        keyboard: true,
        autoPanOnFocus: false,
        icon: L.divIcon({
          className: "hub-map-cluster",
          html: `<span>${Number(cluster.count)}</span>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
      });
      marker.on("click", () => {
        map.stop();
        map.setView(
          marker.getLatLng(),
          Math.min(map.getMaxZoom(), map.getZoom() + 1),
          { animate: !reduced.matches },
        );
      });
      marker.addTo(layer);
      clusters.set(cluster.cluster_id, { layer: marker, count: cluster.count });
    }
    stylePins();
    options.onVisible(visible);
    options.onStatus({
      hint: data.truncated ? "Zoom in to reveal more markers." : "",
      error: imageFailed ? "The map image could not load. Please retry." : "",
    });
  }
  function loadImage(url: string, retry = false) {
    if (overlay && !retry) return;
    if (overlay) map.removeLayer(overlay);
    imageReady = false;
    imageFailed = false;
    options.onStatus({ loading: true });
    overlay = L.imageOverlay(url, bounds, {
      alt: "Fictional demonstration map. Not GTA VI geography.",
      interactive: false,
    })
      .on("load", () => {
        if (disposed) return;
        imageReady = true;
        options.onStatus({ loading: false, error: "" });
      })
      .on("error", () => {
        imageFailed = true;
        if (!disposed)
          options.onStatus({
            loading: false,
            error: "The map image could not load. Please retry.",
          });
      })
      .addTo(map);
  }
  async function refresh() {
    const ticket = requests.start(),
      b = map.getBounds();
    const query = viewportQuery(
      {
        west: b.getWest(),
        east: b.getEast(),
        north: b.getNorth(),
        south: b.getSouth(),
        zoom: map.getZoom(),
      },
      options.filters,
    );
    try {
      const response = await fetch(`/api/map?${query}`, {
        signal: ticket.signal,
        // Anything narrowed by the reader's own progress or saved list is
        // personal to them and must not be served from a shared cache.
        cache:
          options.filters.hideCompleted || options.filters.visitLater
            ? "no-store"
            : "default",
      });
      if (!response.ok)
        throw Error(
          "Could not refresh markers. Your map position has been preserved.",
        );
      const data: Payload = await response.json();
      if (disposed || !ticket.current()) return;
      options.onHidden?.(data.hidden ?? 0);
      loadImage(data.map.image_url);
      if (interacting) pending = data;
      else reconcile(data);
    } catch (e) {
      if (!disposed && ticket.current()) {
        // A rejected fetch (offline, DNS, blocked request) carries a browser
        // string like "Failed to fetch", which was being rendered verbatim in
        // the map's error panel. Only messages we wrote are shown to a reader.
        const message =
          e instanceof Error && e.message.startsWith("Could not refresh")
            ? e.message
            : "Could not reach the map service. Your map position has been preserved.";
        options.onStatus({ loading: false, error: message });
      }
    }
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
    }, 120);
  }
  function startMove() {
    interacting = true;
    pending = undefined;
    requests.cancel();
    clearTimeout(timer);
  }
  function endMove() {
    interacting = false;
    if (pending) {
      reconcile(pending);
      pending = undefined;
    }
    schedule();
  }
  map.on("movestart zoomstart", startMove);
  map.on("moveend zoomend", endMove);
  /**
   * The motion preference was read once at construction, so a visitor who
   * turned it on while the map was open kept every pan and zoom animation
   * until they navigated away. Leaflet reads these options per interaction, so
   * updating them in place is enough -- and the handlers below already consult
   * `reduced.matches` live.
   */
  const onMotionPreference = () => {
    const animate = !reduced.matches;
    map.options.inertia = animate;
    map.options.zoomAnimation = animate;
    map.options.fadeAnimation = animate;
    map.options.markerZoomAnimation = animate;
  };
  // Safari below 14 exposes only the deprecated addListener on a
  // MediaQueryList, so subscribing is feature-checked rather than assumed.
  const unsubscribeMotion = (() => {
    if (typeof reduced.addEventListener === "function") {
      reduced.addEventListener("change", onMotionPreference);
      return () => reduced.removeEventListener("change", onMotionPreference);
    }
    const legacy = reduced as MediaQueryList & {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    legacy.addListener?.(onMotionPreference);
    return () => legacy.removeListener?.(onMotionPreference);
  })();

  const resize = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (disposed) return;
      const center = map.getCenter(),
        zoom = map.getZoom();
      map.invalidateSize({ pan: false, animate: false, debounceMoveend: true });
      const minimum = minimumZoom(root.clientWidth, root.clientHeight);
      map.setMinZoom(minimum);
      map.setView(center, Math.max(minimum, zoom), { animate: false });
      schedule();
    });
  });
  resize.observe(root);
  void refresh();
  return {
    update(next: MapOptions) {
      // Compared field by field: the explorer rebuilds the filter object on
      // every render, so an identity check would treat every render as a
      // filter change and clear the whole marker layer.
      const filtersChanged = (
        Object.keys(next.filters) as (keyof MapFilters)[]
      ).some((key) => next.filters[key] !== options.filters[key]);
      const progressChanged = next.completed !== options.completed;
      options = next;
      stylePins();
      if (filtersChanged) {
        requests.cancel();
        pending = undefined;
        lastData = undefined;
        layer.clearLayers();
        pins.clear();
        clusters.clear();
        options.onVisible([]);
        schedule();
      } else if (progressChanged) {
        if (lastData) reconcile(lastData);
        if (options.filters.hideCompleted || options.filters.visitLater)
          schedule();
      }
    },
    focus(record: RecordMarker) {
      map.stop();
      const mobile = window.innerWidth <= 600;
      /**
       * How much of the canvas the marker panel hides.
       *
       * On a phone it hides none of it: the stage gives up its space to the
       * sheet (see `--map-sheet-h` in map.css), so `root` is already the
       * visible area. On a wider screen the panel floats over the right of the
       * canvas, so its measured width is what has to be kept clear. This used
       * to be a hard-coded fraction in both directions, which stopped matching
       * the moment the sheet's height changed in CSS and left the visible strip
       * of map empty.
       */
      const panel = document.querySelector<HTMLElement>(".map-detail");
      const obscuredWidth =
        !mobile && panel
          ? Math.min(
              root.clientWidth * 0.6,
              panel.getBoundingClientRect().width + 32,
            )
          : 0;
      // Only pan if the marker would sit outside the unobscured canvas.
      map.panInside([MAP_HEIGHT - record.y, record.x], {
        paddingTopLeft: [32, 32],
        paddingBottomRight: [
          mobile ? 32 : obscuredWidth || Math.min(342, root.clientWidth * 0.55),
          32,
        ],
        animate: !reduced.matches,
        duration: 0.25,
      });
    },
    reset() {
      fit();
      schedule();
    },
    retry() {
      if (!imageReady && lastData) loadImage(lastData.map.image_url, true);
      void refresh();
    },
    destroy() {
      disposed = true;
      requests.cancel();
      clearTimeout(timer);
      cancelAnimationFrame(resizeFrame);
      unsubscribeMotion();
      resize.disconnect();
      map.off();
      map.remove();
      pins.clear();
      clusters.clear();
    },
  };
}
