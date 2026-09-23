import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LatestRequest,
  minimumZoom,
  viewportQuery,
  parseFilters,
  filterParams,
  noFilters,
  hasFilters,
} from "@/lib/map/viewport";
import { createMapController, type MapOptions } from "@/lib/map/controller";
import type { Marker } from "@/types/content";
import type * as Leaflet from "leaflet";

const record = {
  id: "entity-1",
  marker_id: "pin-1",
  marker_category: "missions",
  title: "Demo marker",
  x: 500,
  y: 300,
} as Marker;
const payload = (markers = [record]) => ({
  map: { image_url: "/demo-map.svg" },
  markers,
  clusters: [],
  truncated: false,
});
let panelElement: { getBoundingClientRect: () => { width: number } } | null =
  null;
const stubPanel = (width: number | null) => {
  panelElement =
    width === null ? null : { getBoundingClientRect: () => ({ width }) };
};

function harness(reduced = false) {
  const events = new Map<string, () => void>();
  const bounds = {
    pad: () => bounds,
    getWest: () => 0,
    getEast: () => 1600,
    getNorth: () => 1000,
    getSouth: () => 0,
  };
  const map = {
    stop: vi.fn(),
    setMinZoom: vi.fn(),
    fitBounds: vi.fn(),
    getBounds: () => bounds,
    getCenter: () => ({ lat: 500, lng: 800 }),
    getZoom: () => 1.5,
    getMaxZoom: () => 3,
    panInside: vi.fn(),
    setView: vi.fn(),
    invalidateSize: vi.fn(),
    removeLayer: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    on: vi.fn((names: string, fn: () => void) =>
      names.split(" ").forEach((name) => events.set(name, fn)),
    ),
  };
  const layer = {
    addTo: vi.fn().mockReturnThis(),
    removeLayer: vi.fn(),
    clearLayers: vi.fn(),
  };
  const made: Array<ReturnType<typeof makeMarker>> = [];
  function makeMarker(position: number[]) {
    const handlers = new Map<string, () => void>();
    const element = {
      classList: { toggle: vi.fn() },
      setAttribute: vi.fn(),
      textContent: "",
    };
    const marker = {
      getElement: () => element,
      getLatLng: () => ({ lat: position[0], lng: position[1] }),
      setLatLng: vi.fn(),
      setIcon: vi.fn(),
      setZIndexOffset: vi.fn(),
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn((name: string, fn: () => void) => {
        handlers.set(name, fn);
        return marker;
      }),
      handlers,
    };
    return marker;
  }
  const imageEvents = new Map<string, () => void>();
  const overlay = {
    on: vi.fn((name: string, fn: () => void) => {
      imageEvents.set(name, fn);
      return overlay;
    }),
    addTo: vi.fn().mockReturnThis(),
  };
  const L = {
    CRS: { Simple: {} },
    latLngBounds: () => bounds,
    map: vi.fn<(_root: unknown, _options: unknown) => typeof map>(() => map),
    control: { zoom: () => ({ addTo: vi.fn() }) },
    layerGroup: () => layer,
    marker: vi.fn((position: number[]) => {
      const marker = makeMarker(position);
      made.push(marker);
      return marker;
    }),
    divIcon: vi.fn((options: unknown) => options),
    imageOverlay: vi.fn(() => overlay),
  };
  let resize = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal("window", {
    innerWidth: 1200,
    matchMedia: () => ({ matches: reduced }),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(fn: () => void) {
        resize = fn;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => {
    fn();
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  // `focus` measures the open marker panel so the pan padding cannot drift
  // away from the sheet's real height in CSS. The default harness has no panel
  // open; `stubPanel` below supplies one.
  vi.stubGlobal("document", {
    querySelector: () => panelElement,
  });
  const options: MapOptions = {
    filters: { ...noFilters },
    selected: "",
    completed: new Set(),
    onSelect: vi.fn(),
    onVisible: vi.fn(),
    onStatus: vi.fn(),
  };
  const controller = createMapController(
    { clientWidth: 1000, clientHeight: 700 } as HTMLDivElement,
    L as unknown as typeof Leaflet,
    options,
  );
  return {
    map,
    layer,
    L,
    made,
    options,
    controller,
    disconnect,
    resize: () => resize(),
    emit: (name: string) => events.get(name)?.(),
    imageEvents,
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => payload() }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
describe("map viewport", () => {
  it("converts north-up map coordinates to image coordinates and buffers the viewport", () => {
    const q = viewportQuery(
      { west: 200, east: 800, north: 700, south: 400, zoom: 1 },
      { ...noFilters, category: "missions", hideCompleted: true },
    );
    expect(Object.fromEntries(q)).toEqual({
      x1: "168",
      x2: "832",
      y1: "268",
      y2: "632",
      zoom: "1",
      category: "missions",
      missing: "1",
    });
  });
  /**
   * The filters are the URL. A default value that still serialised would put
   * `?category=&region=&missing=0` into the address bar of every plain map
   * link, and a shared link is supposed to be readable.
   */
  it("writes only the filters a reader actually set", () => {
    expect(filterParams(noFilters).size).toBe(0);
    expect(hasFilters(noFilters)).toBe(false);
    const set = {
      ...noFilters,
      category: "collectibles",
      subcategory: "collectibles-set",
      region: "demo-coast",
      hideCompleted: true,
      visitLater: true,
    };
    expect(Object.fromEntries(filterParams(set))).toEqual({
      category: "collectibles",
      sub: "collectibles-set",
      region: "demo-coast",
      missing: "1",
      later: "1",
    });
    expect(hasFilters(set)).toBe(true);
  });

  it("round-trips filters through the address bar", () => {
    const set = {
      ...noFilters,
      category: "vehicles",
      region: "demo-coast",
      visitLater: true,
      near: "marker-1",
      radius: 400,
    };
    expect(parseFilters(filterParams(set))).toEqual(set);
  });

  it("refuses a nonsensical radius rather than querying with it", () => {
    for (const raw of ["", "abc", "-5", "0", "NaN"])
      expect(
        parseFilters(new URLSearchParams({ near: "m", radius: raw })).radius,
      ).toBe(noFilters.radius);
    expect(
      parseFilters(new URLSearchParams({ near: "m", radius: "99999" })).radius,
    ).toBe(2000);
  });

  it("clamps zoomed-out requests to the image", () => {
    const q = viewportQuery(
      { west: -900, east: 2400, north: 2000, south: -500, zoom: -2 },
      noFilters,
    );
    expect([q.get("x1"), q.get("x2"), q.get("y1"), q.get("y2")]).toEqual([
      "0",
      "1600",
      "0",
      "1000",
    ]);
  });
  it("fits the complete image on mobile with snap-aligned zoom and padding", () => {
    const z = minimumZoom(375, 430);
    expect(1600 * 2 ** z).toBeLessThanOrEqual(351);
    expect(z * 4).toBe(Math.floor(z * 4));
    expect(minimumZoom(0, 0)).toBe(-4);
  });
  it("invalidates responses even if they finish parsing after abort", () => {
    const requests = new LatestRequest(),
      old = requests.start(),
      next = requests.start();
    expect(old.signal.aborted).toBe(true);
    expect(old.current()).toBe(false);
    expect(next.current()).toBe(true);
    requests.cancel();
    expect(next.current()).toBe(false);
  });
});
describe("map interaction regressions", () => {
  it("retains marker instances across movement and does not zoom or refetch on selection", async () => {
    const h = harness();
    await flush();
    expect(h.made).toHaveLength(1);
    h.emit("movestart");
    h.emit("moveend");
    await vi.advanceTimersByTimeAsync(120);
    expect(h.made).toHaveLength(1);
    expect(h.layer.clearLayers).not.toHaveBeenCalled();
    const requests = vi.mocked(fetch).mock.calls.length;
    h.controller.update({ ...h.options, selected: record.marker_id });
    expect(h.made[0].setIcon).not.toHaveBeenCalled();
    expect(h.map.setView).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(requests);
    h.made[0].handlers.get("click")?.();
    expect(h.options.onSelect).toHaveBeenCalledWith(record);
    h.controller.destroy();
  });
  it("discards an older response that arrives after a filter change", async () => {
    let resolve!: (data: ReturnType<typeof payload>) => void;
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        new Promise((r) => {
          resolve = r;
        }),
    } as Response);
    const h = harness();
    await flush();
    h.controller.update({
      ...h.options,
      filters: { ...h.options.filters, category: "vehicles" },
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => payload([]),
    } as Response);
    await vi.advanceTimersByTimeAsync(120);
    resolve(payload());
    await flush();
    expect(h.made).toHaveLength(0);
    expect(h.options.onVisible).toHaveBeenLastCalledWith([]);
    h.controller.destroy();
  });
  it("coalesces rapid movement into a single refresh", async () => {
    const h = harness();
    await flush();
    for (let i = 0; i < 5; i++) {
      h.emit("zoomstart");
      h.emit("zoomend");
      await vi.advanceTimersByTimeAsync(40);
    }
    await vi.advanceTimersByTimeAsync(120);
    expect(fetch).toHaveBeenCalledTimes(2);
    h.controller.destroy();
  });
  it("preserves center and zoom when the canvas resizes", async () => {
    const h = harness();
    await flush();
    h.resize();
    expect(h.map.invalidateSize).toHaveBeenCalledWith({
      pan: false,
      animate: false,
      debounceMoveend: true,
    });
    expect(h.map.setView).toHaveBeenCalledWith({ lat: 500, lng: 800 }, 1.5, {
      animate: false,
    });
    h.controller.destroy();
    expect(h.disconnect).toHaveBeenCalledOnce();
  });
  it("honors reduced motion and focuses without altering zoom", async () => {
    stubPanel(null);
    const h = harness(true);
    await flush();
    h.controller.focus(record);
    expect(h.L.map.mock.calls[0]?.[1]).toMatchObject({
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    expect(h.map.panInside).toHaveBeenCalledWith([700, 500], {
      animate: false,
      duration: 0.25,
      paddingTopLeft: [32, 32],
      paddingBottomRight: [342, 32],
    });
    expect(h.map.setView).not.toHaveBeenCalled();
    h.controller.destroy();
  });
  it("keeps the marker clear of the panel's real width, not a fixed fraction", async () => {
    stubPanel(280);
    const h = harness(true);
    await flush();
    h.controller.focus(record);
    // 280 of panel + 32 of breathing room, under the 60% cap for a 1000px
    // canvas. A hard-coded fraction here is what let the panel and the pan
    // padding drift apart.
    expect(h.map.panInside).toHaveBeenCalledWith([700, 500], {
      animate: false,
      duration: 0.25,
      paddingTopLeft: [32, 32],
      paddingBottomRight: [312, 32],
    });
    h.controller.destroy();
    stubPanel(null);
  });
  it("keeps the current markers on a network failure and supports retry", async () => {
    const h = harness();
    await flush();
    vi.mocked(fetch).mockRejectedValueOnce(Error("Offline"));
    h.controller.retry();
    await flush();
    expect(h.made).toHaveLength(1);
    expect(h.layer.clearLayers).not.toHaveBeenCalled();
    // A rejected fetch carries a browser string ("Offline", "Failed to
    // fetch"). The panel must show copy we wrote, not that.
    expect(h.options.onStatus).toHaveBeenCalledWith({
      loading: false,
      error:
        "Could not reach the map service. Your map position has been preserved.",
    });
    h.controller.retry();
    await flush();
    expect(h.made).toHaveLength(1);
    h.controller.destroy();
  });
  it("reports a rejected request and a failed response with distinct copy", async () => {
    const h = harness();
    await flush();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);
    h.controller.retry();
    await flush();
    expect(h.options.onStatus).toHaveBeenCalledWith({
      loading: false,
      error: "Could not refresh markers. Your map position has been preserved.",
    });
    h.controller.destroy();
  });
  it("prevents delayed responses from touching an unmounted map", async () => {
    let resolve!: (data: ReturnType<typeof payload>) => void;
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        new Promise((r) => {
          resolve = r;
        }),
    } as Response);
    const h = harness();
    await flush();
    h.controller.destroy();
    resolve(payload());
    await flush();
    expect(h.made).toHaveLength(0);
    expect(h.map.remove).toHaveBeenCalledOnce();
  });
});
