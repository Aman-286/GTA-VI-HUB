export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1000;
export type Viewport = {
  west: number;
  east: number;
  north: number;
  south: number;
  zoom: number;
};
/**
 * Every way a reader can narrow the map. Held as one object rather than a
 * growing argument list so the URL, the request and the controller all agree
 * on the shape, and so adding a filter is one field rather than four
 * signatures.
 */
export interface MapFilters {
  category: string;
  subcategory: string;
  region: string;
  /** Hide markers whose record the reader has already completed. */
  hideCompleted: boolean;
  /** Only markers the reader saved to visit later. */
  visitLater: boolean;
  /** Only markers within `radius` of this marker. Empty for the whole view. */
  near: string;
  radius: number;
}

export const noFilters: MapFilters = {
  category: "",
  subcategory: "",
  region: "",
  hideCompleted: false,
  visitLater: false,
  near: "",
  radius: 260,
};

/**
 * Filters as URL search params, shared by the address bar and the request.
 * Only non-default values are written, so a plain map link stays `/gta-6/map`
 * rather than accumulating `?category=&region=&missing=0`.
 */
export function filterParams(filters: MapFilters) {
  const qs = new URLSearchParams();
  if (filters.category) qs.set("category", filters.category);
  if (filters.subcategory) qs.set("sub", filters.subcategory);
  if (filters.region) qs.set("region", filters.region);
  if (filters.hideCompleted) qs.set("missing", "1");
  if (filters.visitLater) qs.set("later", "1");
  if (filters.near) {
    qs.set("near", filters.near);
    qs.set("radius", String(filters.radius));
  }
  return qs;
}

export function parseFilters(params: URLSearchParams): MapFilters {
  const radius = Number(params.get("radius"));
  return {
    category: params.get("category") || "",
    subcategory: params.get("sub") || "",
    region: params.get("region") || "",
    hideCompleted: params.get("missing") === "1",
    visitLater: params.get("later") === "1",
    near: params.get("near") || "",
    radius:
      Number.isFinite(radius) && radius > 0
        ? Math.min(2000, Math.round(radius))
        : noFilters.radius,
  };
}

export const hasFilters = (filters: MapFilters) =>
  filterParams(filters).size > 0;

export function viewportQuery(view: Viewport, filters: MapFilters) {
  const pad = 64 / 2 ** view.zoom;
  const qs = filterParams(filters);
  qs.set("x1", String(Math.max(0, view.west - pad)));
  qs.set("x2", String(Math.min(MAP_WIDTH, view.east + pad)));
  qs.set("y1", String(Math.max(0, MAP_HEIGHT - view.north - pad)));
  qs.set("y2", String(Math.min(MAP_HEIGHT, MAP_HEIGHT - view.south + pad)));
  qs.set("zoom", String(view.zoom));
  return qs;
}
export function minimumZoom(width: number, height: number) {
  const fit = Math.log2(
    Math.min(
      Math.max(1, width - 24) / MAP_WIDTH,
      Math.max(1, height - 24) / MAP_HEIGHT,
    ),
  );
  return Math.max(-4, Math.min(0, Math.floor(fit * 4) / 4));
}
/** A response may finish parsing after cancellation. The sequence guard handles that race. */
export class LatestRequest {
  private sequence = 0;
  private controller?: AbortController;
  start() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const sequence = ++this.sequence;
    return {
      signal: controller.signal,
      current: () => sequence === this.sequence && !controller.signal.aborted,
    };
  }
  cancel() {
    ++this.sequence;
    this.controller?.abort();
  }
}
