"use client";
import { useEffect, useRef, useState } from "react";
import type { Marker } from "@/types/content";
import { createMapController, type MapOptions } from "@/lib/map/controller";
import "leaflet/dist/leaflet.css";
type Props = Omit<MapOptions, "onStatus"> & {
  resetKey: number;
  focusTarget: Marker | null;
};
export function MapCanvas(props: Props) {
  const root = useRef<HTMLDivElement>(null),
    controller = useRef<ReturnType<typeof createMapController> | null>(null),
    latest = useRef(props);
  const [status, setStatus] = useState({ loading: true, error: "", hint: "" });
  useEffect(() => {
    latest.current = props;
    controller.current?.update({
      ...props,
      onStatus: (patch) => setStatus((old) => ({ ...old, ...patch })),
    });
  }, [props]);
  useEffect(() => {
    let disposed = false;
    void import("leaflet")
      .then((L) => {
        if (disposed || !root.current) return;
        controller.current = createMapController(root.current, L, {
          ...latest.current,
          onStatus: (patch) => setStatus((old) => ({ ...old, ...patch })),
        });
        if (latest.current.focusTarget)
          controller.current.focus(latest.current.focusTarget);
      })
      .catch(() => {
        if (!disposed)
          setStatus({
            loading: false,
            error:
              "The map engine could not load. Reload this page to try again.",
            hint: "",
          });
      });
    return () => {
      disposed = true;
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    if (props.focusTarget) controller.current?.focus(props.focusTarget);
  }, [props.focusTarget]);
  useEffect(() => {
    if (props.resetKey) controller.current?.reset();
  }, [props.resetKey]);
  return (
    <>
      <div
        className="leaflet-host"
        ref={root}
        role="region"
        aria-label="Interactive demonstration map"
      />
      {status.loading && (
        <div className="map-loading" role="status">
          <div className="skeleton" />
          <p>Opening your map…</p>
        </div>
      )}
      {status.error && (
        <div className="map-error" role="alert">
          {status.error}
          <button
            className="button small"
            onClick={() =>
              controller.current
                ? controller.current.retry()
                : window.location.reload()
            }
          >
            Retry
          </button>
        </div>
      )}
      {status.hint && !status.error && (
        <div className="map-hint" role="status">
          {status.hint}
        </div>
      )}
    </>
  );
}
