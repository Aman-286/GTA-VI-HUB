"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EyeOff, LoaderCircle } from "lucide-react";
import { openSpoilerSettings } from "./spoiler-settings";

/**
 * The wall a reader meets when they open a record the server decided not to
 * show them. Everything below it -- the title, the body, the walkthrough, the
 * imagery -- was never rendered, so there is nothing on this page to peek at.
 *
 * "Reveal once" re-requests the same page with `?reveal=1`. Honouring that
 * parameter is safe precisely because it takes a deliberate click on the
 * record's own URL: nothing links to it, no listing produces it, and no
 * crawler follows it (the page is noindex while concealed).
 */
export function SpoilerGate({
  title,
  reason,
  category,
  categoryName,
}: {
  title: string;
  reason: string;
  category: string;
  categoryName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function revealOnce() {
    setBusy("once");
    const url = new URL(window.location.href);
    url.searchParams.set("reveal", "1");
    router.replace(url.pathname + url.search);
  }

  async function always() {
    setBusy("always");
    setError("");
    try {
      const r = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reveal_category: category,
          reveal_value: true,
        }),
      });
      if (!r.ok)
        throw Error(
          (await r.json().catch(() => ({}))).error ||
            "Your setting was not saved. Please try again.",
        );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  return (
    <div className="spoiler-gate">
      <span className="spoiler-gate-icon" aria-hidden="true">
        <EyeOff size={26} />
      </span>
      <h1>{title}</h1>
      <p className="muted">{reason}</p>
      <p className="muted spoiler-gate-note">
        Nothing from this record has been loaded. Choosing to see it is up to
        you.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="spoiler-gate-actions">
        <button
          type="button"
          className="button primary"
          onClick={revealOnce}
          disabled={Boolean(busy)}
        >
          {busy === "once" ? (
            <>
              <LoaderCircle size={15} className="spin" aria-hidden="true" />
              Opening…
            </>
          ) : (
            "Reveal this once"
          )}
        </button>
        {category && (
          <button
            type="button"
            className="button"
            onClick={always}
            disabled={Boolean(busy)}
          >
            {busy === "always" ? (
              <>
                <LoaderCircle size={15} className="spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              `Always show ${categoryName.toLowerCase()}`
            )}
          </button>
        )}
        <button
          type="button"
          className="text-link"
          onClick={openSpoilerSettings}
        >
          Spoiler settings
        </button>
      </div>
    </div>
  );
}
