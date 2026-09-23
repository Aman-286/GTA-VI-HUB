"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Entity, entityUrl, labels, kinds } from "@/types/content";
import { Badge } from "@/components/ui";
export function SearchCommand() {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Entity[]>([]),
    [active, setActive] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // The palette opens from a global shortcut and a custom event, not from a
  // Dialog.Trigger, so Radix has no trigger to hand focus back to. Without
  // this, pressing Escape dropped focus to <body> and a keyboard user had to
  // tab from the top of the page to get back to where they were.
  const restoreFocus = useRef<HTMLElement | null>(null);
  const returnFocus = useCallback(() => {
    const target = restoreFocus.current;
    restoreFocus.current = null;
    // After the close animation, so Radix's own teardown cannot steal it back.
    if (target?.isConnected)
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }, []);
  useEffect(() => {
    const remember = () => {
      const active = document.activeElement;
      restoreFocus.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
    };
    const show = (e: Event) => {
      remember();
      setQuery((e as CustomEvent<string>).detail || "");
      setOpen(true);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((x) => {
          if (x) returnFocus();
          else remember();
          return !x;
        });
      }
    };
    window.addEventListener("hub-search", show);
    window.addEventListener("keydown", key);
    try {
      setRecent(
        JSON.parse(localStorage.getItem("hub-recent-searches") || "[]"),
      );
    } catch {}
    return () => {
      window.removeEventListener("hub-search", show);
      window.removeEventListener("keydown", key);
    };
  }, [returnFocus]);
  useEffect(() => {
    controller.current?.abort();
    if (!open || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const c = new AbortController();
    controller.current = c;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: c.signal,
        });
        if (!r.ok) throw Error();
        const data = await r.json();
        setResults(
          data.items.sort((a: Entity, b: Entity) =>
            a.kind.localeCompare(b.kind),
          ),
        );
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          setError("Search is unavailable. Please try again.");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query, open]);
  function go(href: string) {
    if (query.trim().length >= 2)
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          entity_id: results.find((e) => entityUrl(e) === href)?.id,
        }),
      }).catch(() => {});
    const next = [query, ...recent.filter((q) => q !== query)]
      .filter(Boolean)
      .slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem("hub-recent-searches", JSON.stringify(next));
    } catch {}
    // Navigating away -- the remembered element is about to be irrelevant.
    restoreFocus.current = null;
    setOpen(false);
    router.push(href);
  }
  const category = kinds.find(
    (k) =>
      query.trim().toLowerCase() === k ||
      query.trim().toLowerCase() === labels[k].toLowerCase(),
  );
  const special = /map/i.test(query)
    ? { label: "Interactive map", url: "/gta-6/map" }
    : /cheat/i.test(query)
      ? { label: "Cheat code database", url: "/gta-6/cheats" }
      : category
        ? {
            label: `Browse ${labels[category].toLowerCase()}`,
            url: `/gta-6/${category}`,
          }
        : null;
  const links = [
    ...(special ? [special] : []),
    ...results.map((e) => ({ label: e.title, url: entityUrl(e) })),
  ];
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) returnFocus();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="search-dialog"
          aria-describedby="search-description"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
          }}
        >
          <Dialog.Title className="eyebrow">Search GTA VI Hub</Dialog.Title>
          <Dialog.Description id="search-description" className="sr-only">
            Search published records. Use arrow keys and Enter to open a result.
          </Dialog.Description>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Close search"
          >
            <X size={20} />
          </Dialog.Close>
          <div className="command-input">
            <Search size={22} />
            <input
              ref={input}
              autoComplete="off"
              placeholder="What are you looking for?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search all content"
              role="combobox"
              aria-expanded={links.length > 0}
              aria-controls="search-results"
              aria-activedescendant={
                links[active] ? `search-result-${active}` : undefined
              }
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, links.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                }
                if (e.key === "Enter") {
                  if (links[active]) go(links[active].url);
                  else go("/search?q=" + encodeURIComponent(query));
                }
              }}
            />
            {loading && <LoaderCircle size={18} className="spin" />}
          </div>
          <div className="search-results">
            {!query && (
              <div className="search-suggestions">
                <p className="eyebrow">
                  {recent.length ? "Recent searches" : "Start exploring"}
                </p>
                {(recent.length
                  ? recent
                  : ["Interactive map", "Missions", "Vehicles", "Collectibles"]
                ).map((q) => (
                  <button
                    className="search-result"
                    key={q}
                    onClick={() => setQuery(q)}
                  >
                    {q}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            )}
            {/* Only the arrow-key targets belong to the listbox. The prompts
                above fill the input instead of opening a record, so including
                them made aria-activedescendant point into a set the keyboard
                could not actually reach. */}
            <div id="search-results" role="listbox" aria-label="Search results">
              {special && (
                <button
                  id="search-result-0"
                  role="option"
                  aria-selected={active === 0}
                  className={`search-result ${active === 0 ? "selected" : ""}`}
                  onClick={() => go(special.url)}
                >
                  {special.label}
                  <ArrowUpRight size={16} />
                </button>
              )}
              {results.map((e, i) => (
                <button
                  role="option"
                  aria-selected={active === i + (special ? 1 : 0)}
                  id={`search-result-${i + (special ? 1 : 0)}`}
                  className={`search-result ${active === i + (special ? 1 : 0) ? "selected" : ""}`}
                  key={e.id}
                  onClick={() => go(entityUrl(e))}
                >
                  <span>
                    <small>{labels[e.kind]}</small>
                    <strong>
                      {e.title} <Badge entity={e} />
                    </strong>
                    <span>{e.description}</span>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
            {error && <p role="alert">{error}</p>}
            {query && !loading && !error && !results.length && !special && (
              <div className="search-empty">
                <h3>No results for “{query}”</h3>
                <p>
                  Try a broader term, browse a category, or help us fill the
                  gap.
                </p>
                <button className="button" onClick={() => go("/submit")}>
                  Submit information
                </button>
              </div>
            )}
          </div>
          <div className="command-footer">
            <span>↑ ↓ to navigate · Enter to open</span>
            <span>Esc to close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
