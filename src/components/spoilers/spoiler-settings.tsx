"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, X, LoaderCircle, Check } from "lucide-react";
import {
  spoilerModeLabels,
  spoilerModeDescriptions,
  spoilerModes,
  type SpoilerMode,
} from "@/lib/spoilers/policy";

interface Category {
  id: string;
  name: string;
  description: string;
}
interface MissionOption {
  id: string;
  sequence: number | null;
  label: string;
  concealed: boolean;
}
interface Preferences {
  signed_in: boolean;
  spoiler: {
    mode: SpoilerMode;
    story_sequence: number | null;
    story_entity_id: string | null;
    revealed: string[];
  };
  categories: Category[];
  missions: MissionOption[];
}

export const openSpoilerSettings = () =>
  window.dispatchEvent(new Event("hub-spoiler-settings"));

export function SpoilerSettings() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const modeId = useId();
  const missionId = useId();
  // Radix hands focus back to its own trigger. This dialog opens from a custom
  // event fired by several places, so the element to return to is remembered
  // here instead -- otherwise Escape drops focus onto <body>.
  const restoreFocus = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/preferences");
      if (!r.ok) throw Error("Could not load your spoiler settings.");
      setData((await r.json()) as Preferences);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const show = () => {
      const active = document.activeElement;
      restoreFocus.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      setOpen(true);
      void load();
    };
    window.addEventListener("hub-spoiler-settings", show);
    return () => window.removeEventListener("hub-spoiler-settings", show);
  }, [load]);

  function close(next: boolean) {
    setOpen(next);
    if (!next) {
      const target = restoreFocus.current;
      restoreFocus.current = null;
      if (target?.isConnected)
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  }

  /**
   * Applied to the control first, sent second.
   *
   * These are radio buttons and checkboxes, which a reader expects to respond
   * to the press itself. Waiting for the round trip before moving them made
   * the panel feel broken -- the click landed, nothing moved, and a second
   * click arrived before the first had saved. `optimistic` moves the control
   * immediately; a failed save puts it back and says why.
   */
  async function save(
    patch: Record<string, unknown>,
    optimistic: (previous: Preferences["spoiler"]) => Preferences["spoiler"],
  ) {
    const previous = data?.spoiler;
    if (!previous) return;
    setData((d) => (d ? { ...d, spoiler: optimistic(d.spoiler) } : d));
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok)
        throw Error(
          (await r.json().catch(() => ({}))).error ||
            "Your setting was not saved. Please try again.",
        );
      const result = (await r.json()) as { spoiler: Preferences["spoiler"] };
      setData((d) => (d ? { ...d, spoiler: result.spoiler } : d));
      setSaved(true);
      window.dispatchEvent(new Event("hub-spoilers"));
      // The pages behind the dialog were rendered against the old setting, so
      // the server has to compose them again. Without this the reader changes
      // the mode and the listing under the dialog still hides everything.
      router.refresh();
    } catch (e) {
      setData((d) => (d ? { ...d, spoiler: previous } : d));
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const spoiler = data?.spoiler;

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="modal spoiler-dialog"
          aria-describedby={`${modeId}-description`}
        >
          <Dialog.Title className="spoiler-dialog-title">
            Spoiler settings
          </Dialog.Title>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Close spoiler settings"
          >
            <X size={20} />
          </Dialog.Close>
          <p className="muted" id={`${modeId}-description`}>
            Choose how much the companion is allowed to tell you. This applies
            to listings, search, the map, recommendations and community posts.
          </p>

          {loading && (
            <p className="muted dialog-status">
              <LoaderCircle size={15} className="spin" aria-hidden="true" />
              Loading your settings…
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}

          {spoiler && (
            <>
              <fieldset className="spoiler-modes">
                <legend>What may we show you?</legend>
                {spoilerModes.map((mode) => (
                  <label
                    key={mode}
                    className={`spoiler-mode ${spoiler.mode === mode ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`${modeId}-mode`}
                      value={mode}
                      checked={spoiler.mode === mode}
                      onChange={() =>
                        void save({ mode }, (p) => ({ ...p, mode }))
                      }
                    />
                    <span>
                      <b>{spoilerModeLabels[mode]}</b>
                      <small className="muted">
                        {spoilerModeDescriptions[mode]}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="field">
                <label htmlFor={missionId}>Where are you in the story?</label>
                <p className="muted field-hint">
                  Optional. Anything you have already played past stops being
                  treated as a spoiler. Titles we consider spoilers are listed
                  by position only.
                </p>
                <select
                  id={missionId}
                  value={spoiler.story_entity_id || ""}
                  onChange={(e) => {
                    const story_entity_id = e.target.value || null;
                    void save({ story_entity_id }, (p) => ({
                      ...p,
                      story_entity_id,
                    }));
                  }}
                >
                  <option value="">I would rather not say</option>
                  {data.missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {!data.missions.length && (
                  <p className="muted field-hint">
                    No story missions are in the database yet, so there is
                    nothing to choose from.
                  </p>
                )}
              </div>

              <fieldset className="spoiler-categories">
                <legend>Always show these</legend>
                <p className="muted field-hint">
                  Lift the cover permanently for one kind of content while
                  keeping the rest hidden.
                </p>
                {data.categories.map((c) => {
                  const on = spoiler.revealed.includes(c.id);
                  return (
                    <label key={c.id} className="spoiler-category">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          void save(
                            { reveal_category: c.id, reveal_value: !on },
                            (p) => ({
                              ...p,
                              revealed: on
                                ? p.revealed.filter((r) => r !== c.id)
                                : [...p.revealed, c.id],
                            }),
                          )
                        }
                      />
                      <span>
                        <b>{c.name}</b>
                        <small className="muted">{c.description}</small>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <p className="muted dialog-status" role="status">
                {saving ? (
                  <>
                    <LoaderCircle
                      size={14}
                      className="spin"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : saved ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    Saved.{" "}
                    {data.signed_in
                      ? "Stored on your account."
                      : "Stored in this browser. Create an account to keep it across devices."}
                  </>
                ) : data.signed_in ? (
                  "Stored on your account."
                ) : (
                  "Stored in this browser until you create an account."
                )}
              </p>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The control that opens the panel. Rendered in the header and the footer. */
export function SpoilerTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className || "icon-button"}
      onClick={() => openSpoilerSettings()}
      aria-label="Spoiler settings"
      title="Spoiler settings"
    >
      <EyeOff size={19} />
    </button>
  );
}
