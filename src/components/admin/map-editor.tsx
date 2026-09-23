"use client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Entity, kinds, Kind, labels } from "@/types/content";
type Pin = {
  id?: string;
  title?: string;
  entity_id: string;
  category: Kind;
  x: number;
  y: number;
  source_id?: string | null;
};
export function MapEditor({ entities }: { entities: Entity[] }) {
  const [pins, setPins] = useState<Pin[]>([]),
    [pin, setPin] = useState<Pin>({
      entity_id: entities[0]?.id || "",
      category: "locations",
      x: 800,
      y: 500,
    }),
    [message, setMessage] = useState(""),
    [image, setImage] = useState("/demo-map.svg");
  const stage = useRef<HTMLDivElement>(null),
    dragging = useRef(false);
  async function load() {
    const r = await fetch("/api/admin/map");
    if (r.ok) {
      const d = await r.json();
      setPins(d.items);
      setImage(d.map.image_url);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function coords(e: React.PointerEvent) {
    const r = stage.current!.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(1600, Math.round(((e.clientX - r.left) / r.width) * 1600)),
      ),
      y: Math.max(
        0,
        Math.min(1000, Math.round(((e.clientY - r.top) / r.height) * 1000)),
      ),
    };
  }
  async function save() {
    const r = await fetch("/api/admin/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pin),
    });
    const d = await r.json();
    setMessage(r.ok ? "Marker saved." : d.error);
    if (r.ok) {
      setPin({ ...pin, id: d.id });
      await load();
    }
  }
  return (
    <section className="editor-panel">
      <h2>Map editor</h2>
      <p className="muted">
        Click the image to position a marker. Drag the selected marker to adjust
        it, then save. Coordinates use a 1600 × 1000 image space.
      </p>
      <div
        className="admin-map"
        ref={stage}
        onPointerDown={(e) => {
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).tagName === "IMG"
          )
            setPin({ ...pin, ...coords(e) });
        }}
        onPointerMove={(e) => {
          if (dragging.current) setPin((p) => ({ ...p, ...coords(e) }));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <Image
          src={image}
          alt="Fictional map editor coordinate surface"
          width={1600}
          height={1000}
          unoptimized
        />
        {pins
          .filter((p) => p.id !== pin.id)
          .map((p) => (
            <button
              key={p.id}
              className="admin-pin"
              style={{ left: `${p.x / 16}%`, top: `${p.y / 10}%` }}
              aria-label={`Edit ${p.title}`}
              onClick={() => setPin(p)}
            >
              ·
            </button>
          ))}
        <button
          className="admin-pin active"
          style={{ left: `${pin.x / 16}%`, top: `${pin.y / 10}%` }}
          aria-label="Selected marker, drag to move"
          onPointerDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        >
          +
        </button>
      </div>
      <div className="form-grid">
        <label>
          Entity
          <select
            value={pin.entity_id}
            onChange={(e) => setPin({ ...pin, entity_id: e.target.value })}
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={pin.category}
            onChange={(e) =>
              setPin({ ...pin, category: e.target.value as Kind })
            }
          >
            {kinds.map((k) => (
              <option value={k} key={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          X
          <input
            type="number"
            min={0}
            max={1600}
            value={pin.x}
            onChange={(e) => setPin({ ...pin, x: Number(e.target.value) })}
          />
        </label>
        <label>
          Y
          <input
            type="number"
            min={0}
            max={1000}
            value={pin.y}
            onChange={(e) => setPin({ ...pin, y: Number(e.target.value) })}
          />
        </label>
        <label>
          Source ID (optional)
          <input
            value={pin.source_id || ""}
            onChange={(e) =>
              setPin({ ...pin, source_id: e.target.value || null })
            }
          />
        </label>
      </div>
      <div className="editor-actions">
        <button className="button primary" onClick={save}>
          Save marker
        </button>
        <button
          className="button"
          onClick={() =>
            setPin({
              entity_id: entities[0]?.id || "",
              category: "locations",
              x: 800,
              y: 500,
            })
          }
        >
          New marker
        </button>
        {pin.id && (
          <button
            className="button danger"
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete this marker? Its previous coordinates will remain in the audit log.",
                )
              )
                return;
              const r = await fetch("/api/admin/map", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: pin.id }),
              });
              setMessage(r.ok ? "Marker deleted." : "Delete failed.");
              if (r.ok) {
                setPin({ ...pin, id: undefined });
                void load();
              }
            }}
          >
            Delete marker
          </button>
        )}
      </div>
      <details>
        <summary>Select map image</summary>
        <p className="muted">
          Use an image already committed to the public asset directory. Uploads
          are disabled to keep storage costs at zero.
        </p>
        <label>
          Local image path
          <input value={image} onChange={(e) => setImage(e.target.value)} />
        </label>
        <button
          className="button"
          onClick={async () => {
            const r = await fetch("/api/admin/map-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_url: image }),
            });
            setMessage(
              r.ok
                ? "Map image selected."
                : "Use a valid local SVG, PNG, JPG or WebP asset path.",
            );
          }}
        >
          Save map image
        </button>
      </details>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </section>
  );
}
