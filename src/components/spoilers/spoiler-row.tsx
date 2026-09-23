"use client";
import { useEffect, useState } from "react";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import type { Entity } from "@/types/content";
import type { EntityView } from "@/lib/spoilers/conceal";
import { EntityRow } from "@/components/ui";

/**
 * A record the server sent masked.
 *
 * The real title, description, image and slug are not in this component's
 * props -- they were never serialised into the page. That is the whole point:
 * a CSS blur would still ship the text to a screen reader, to "view source"
 * and to a link-preview scraper. "Reveal once" fetches the record only when a
 * reader asks for it by name.
 *
 * Markup is a button rather than a div with a handler, so it is reachable by
 * Tab, operable with Enter and Space, and announced with its reason.
 */
export function SpoilerRow({ entity }: { entity: EntityView }) {
  const [revealed, setRevealed] = useState<Entity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const reset = () => setRevealed(null);
    window.addEventListener("hub-spoilers", reset);
    return () => window.removeEventListener("hub-spoilers", reset);
  }, []);

  async function reveal() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/reveal?ids=${encodeURIComponent(entity.id)}`);
      if (!r.ok) throw Error("Could not open this record.");
      const data = (await r.json()) as { items: Entity[] };
      const found = data.items[0];
      if (!found) throw Error("This record is no longer available.");
      setRevealed(found);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (revealed)
    return (
      <div className="spoiler-revealed">
        <p className="spoiler-revealed-note">
          <Eye size={13} aria-hidden="true" /> Revealed for this visit only.
        </p>
        <EntityRow entity={revealed} />
      </div>
    );

  return (
    <div className="spoiler-row">
      <span className="spoiler-row-icon" aria-hidden="true">
        <EyeOff size={20} />
      </span>
      <div className="spoiler-row-main">
        <p className="spoiler-row-title">{entity.title}</p>
        <p className="muted spoiler-row-reason">{entity.spoiler_reason}</p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        className="button small"
        onClick={reveal}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 size={14} className="spin" aria-hidden="true" />
            Opening…
          </>
        ) : (
          "Reveal once"
        )}
      </button>
    </div>
  );
}

/**
 * The single place a listing decides between a normal row and a masked one.
 * Every public list renders through here, so a list added later inherits
 * spoiler safety rather than having to remember it.
 */
export function ContentRow({
  entity,
  children,
}: {
  entity: EntityView;
  children?: React.ReactNode;
}) {
  return entity.concealed ? (
    <SpoilerRow entity={entity} />
  ) : (
    <EntityRow entity={entity}>{children}</EntityRow>
  );
}
