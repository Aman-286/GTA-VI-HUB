"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { Entity } from "@/types/content";
interface ProgressState {
  guest?: boolean;
  progress: { entity_id: string }[];
  favorites: { entity_id: string }[];
  recent: Entity[];
}
const empty: ProgressState = { progress: [], favorites: [], recent: [] };
let sessionRequest: Promise<Response> | null = null;
export async function guestSession() {
  if (!sessionRequest)
    sessionRequest = fetch("/api/session", { method: "POST" }).finally(() => {
      sessionRequest = null;
    });
  const r = await sessionRequest;
  if (!r.ok) throw Error("Could not start your session. Try again.");
}
/**
 * Several components can mount this hook on one page (the map explorer and a
 * record's action bar, for instance). Sharing the in-flight read keeps that to
 * a single request instead of one per component.
 */
let readRequest: Promise<ProgressState> | null = null;
function readProgress() {
  if (!readRequest) {
    const request = fetch("/api/progress").then((r) => {
      if (!r.ok) throw Error("Could not load your checklist.");
      return r.json() as Promise<ProgressState>;
    });
    readRequest = request;
    // Only clear the slot this call owns. A write that lands mid-flight drops
    // the shared promise so the refresh after it reads the new state rather
    // than joining the request that was already on the wire.
    void request
      .catch(() => {})
      .finally(() => {
        if (readRequest === request) readRequest = null;
      });
  }
  return readRequest;
}
export function useProgress() {
  const [state, setState] = useState<ProgressState>(empty),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const requestVersion = useRef({ value: 0 });
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current.value;
    try {
      const data = await readProgress();
      if (version !== requestVersion.current.value) return;
      setState(data ?? empty);
      setError("");
      setReady(true);
    } catch (e) {
      if (version !== requestVersion.current.value) return;
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const lifecycle = requestVersion.current;
    void refresh();
    const listener = () => {
      readRequest = null;
      void refresh();
    };
    const spoilerListener = () => {
      setState(empty);
      setReady(false);
      listener();
    };
    window.addEventListener("hub-progress", listener);
    window.addEventListener("hub-spoilers", spoilerListener);
    return () => {
      window.removeEventListener("hub-progress", listener);
      window.removeEventListener("hub-spoilers", spoilerListener);
      lifecycle.value++;
    };
  }, [refresh]);
  async function toggle(
    id: string,
    type: "progress" | "favorite",
    value: boolean,
  ) {
    setError("");
    const send = () =>
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: id, type, value }),
      });
    try {
      // Writing is the first moment a visitor actually needs an identity, so
      // the guest session is minted here rather than on arrival. The read
      // already told us whether one exists, so the common path does not have
      // to provoke a 401 to find out.
      if (state.guest) await guestSession();
      let r = await send();
      if (r.status === 401) {
        await guestSession();
        r = await send();
      }
      if (!r.ok)
        throw Error(
          (await r.json().catch(() => ({}))).error ||
            "Your change was not saved. Please try again.",
        );
      readRequest = null;
      window.dispatchEvent(new Event("hub-progress"));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  const completed = useMemo(
    () => new Set(state.progress.map((p) => p.entity_id)),
    [state.progress],
  );
  const favorites = useMemo(
    () => new Set(state.favorites.map((f) => f.entity_id)),
    [state.favorites],
  );
  return {
    completed,
    favorites,
    recent: state.recent || [],
    toggle,
    error,
    ready,
    refresh,
    /**
     * True when no session exists yet. Exposed so other writers (the map's
     * marker state, for one) can mint the guest session before their first
     * write instead of discovering the need by provoking a 401 -- which shows
     * up as a red console error on the reader's first interaction.
     */
    guest: state.guest !== false,
  };
}
