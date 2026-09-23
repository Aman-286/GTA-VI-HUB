"use client";
import { useEffect, useState } from "react";
import { kinds, labels, verifications, Entity, Kind } from "@/types/content";
import { domainFields } from "@/lib/content/fields";
/**
 * Mirrors db/migrations/0003_spoilers.sql. Kept as a constant rather than
 * fetched, because the editor form must render before any request resolves and
 * the set only changes with a migration.
 */
const spoilerCategories = [
  { id: "story", name: "Story events" },
  { id: "character", name: "Character details" },
  { id: "ending", name: "Endings" },
  { id: "location", name: "Late-game locations" },
  { id: "mechanic", name: "Systems and unlocks" },
  { id: "side-content", name: "Side content" },
];
type Draft = {
  id?: string;
  kind: Kind;
  title: string;
  slug: string;
  description: string;
  body: string;
  category: string;
  is_demo: number;
  status: "draft" | "published" | "archived";
  verification: Entity["verification"];
  revision?: number;
  source_id?: string;
  fact?: string;
  seo_title?: string;
  meta_description?: string;
  spoiler_level?: number;
  spoiler_category?: string;
  reveal_after_sequence?: number | null;
  safe_title?: string;
  safe_description?: string;
  details: Record<string, string | number | null>;
  objectives: { title: string; instructions: string }[];
  codes: { platform: "PS5" | "Xbox" | "Phone"; code: string }[];
};
const empty: Draft = {
  kind: "missions",
  title: "",
  slug: "",
  description: "",
  body: "",
  category: "",
  is_demo: 0,
  status: "draft",
  verification: "Unverified",
  spoiler_level: 0,
  spoiler_category: "",
  details: {},
  objectives: [],
  codes: [],
};
export function EntityEditor({
  id,
  onClose,
  onSaved,
}: {
  id?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty),
    [sources, setSources] = useState<{ id: string; title: string }[]>([]),
    [revisions, setRevisions] = useState<
      { revision: number; created_at: string; changes: string }[]
    >([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(!!id),
    [preview, setPreview] = useState(false);
  const key = `hub-editor-draft-${id || "new"}`;
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const sourceResponse = await fetch("/api/admin/sources");
        if (!sourceResponse.ok) throw Error("Could not load sources.");
        const sourceData = await sourceResponse.json();
        if (live) setSources(sourceData.items);
        if (id) {
          const r = await fetch(
            `/api/admin/entities?id=${encodeURIComponent(id)}`,
          );
          if (!r.ok) throw Error("Could not load record.");
          const data = await r.json();
          const details = { ...data.details };
          delete details.entity_id;
          if (live) {
            setDraft({
              ...data.entity,
              details,
              objectives: data.objectives,
              codes: data.codes || [],
            });
            setRevisions(data.revisions);
          }
        }
      } catch (e) {
        if (live) setMessage((e as Error).message);
      } finally {
        if (live) setBusy(false);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [id]);
  function update<K extends keyof Draft>(name: K, value: Draft[K]) {
    setDraft((d) => {
      const next = { ...d, [name]: value };
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  async function save(value: Draft) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setDraft({ ...value, id: data.id, revision: data.revision });
      sessionStorage.removeItem(key);
      setMessage(`Saved revision ${data.revision} · ${value.status}`);
      onSaved();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor-panel">
      <div className="heading-row">
        <div>
          <p className="eyebrow">CONTENT EDITOR</p>
          <h2>{draft.id ? "Edit record" : "Create record"}</h2>
        </div>
        <button className="button small" onClick={onClose}>
          Close editor
        </button>
      </div>
      <div className="editor-actions">
        <button
          className="text-link"
          onClick={() => {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              try {
                setDraft(JSON.parse(raw));
                setMessage("Recovered a local draft. Review before saving.");
              } catch {
                setMessage("The local draft could not be read.");
              }
            } else setMessage("No local draft to recover.");
          }}
        >
          Recover local draft
        </button>
        <button className="text-link" onClick={() => setPreview(!preview)}>
          {preview ? "Return to editor" : "Preview content"}
        </button>
        {draft.id && (
          <button
            className="text-link"
            onClick={() => {
              setDraft({
                ...draft,
                id: undefined,
                revision: undefined,
                title: `${draft.title} copy`,
                slug: `${draft.slug}-copy`,
                status: "draft",
              });
              setMessage("Duplicate ready. Choose a unique slug and save.");
            }}
          >
            Duplicate
          </button>
        )}
      </div>
      {preview ? (
        <article className="article-body">
          <h1>{draft.title || "Untitled"}</h1>
          <p>{draft.description}</p>
          {draft.body.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft);
          }}
        >
          <div className="form-grid">
            <label>
              Record type
              <select
                value={draft.kind}
                disabled={!!draft.id}
                onChange={(e) => update("kind", e.target.value as Kind)}
              >
                {kinds.map((k) => (
                  <option value={k} key={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <input
                value={draft.category}
                onChange={(e) => update("category", e.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              Title
              <input
                required
                minLength={3}
                maxLength={140}
                value={draft.title}
                onChange={(e) => {
                  update("title", e.target.value);
                  if (!draft.id)
                    update(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                }}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={draft.slug}
                onChange={(e) => update("slug", e.target.value)}
              />
            </label>
            <label className="full">
              Summary
              <textarea
                rows={2}
                required
                minLength={20}
                maxLength={500}
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <label className="full">
              Body · Plain text, blank lines separate paragraphs
              <textarea
                rows={10}
                value={draft.body}
                maxLength={30000}
                onChange={(e) => update("body", e.target.value)}
              />
            </label>
            {(domainFields[draft.kind] || []).map((f) => (
              <label key={f}>
                {f.replaceAll("_", " ")}
                <input
                  value={draft.details[f] ?? ""}
                  onChange={(e) =>
                    update("details", { ...draft.details, [f]: e.target.value })
                  }
                />
              </label>
            ))}
            {draft.kind === "missions" && (
              <div className="full">
                <h3>Walkthrough objectives</h3>
                {draft.objectives.map((o, i) => (
                  <div className="objective-editor" key={i}>
                    <label>
                      Step {i + 1} title
                      <input
                        value={o.title}
                        onChange={(e) =>
                          update(
                            "objectives",
                            draft.objectives.map((v, n) =>
                              n === i ? { ...v, title: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Instructions
                      <textarea
                        value={o.instructions}
                        onChange={(e) =>
                          update(
                            "objectives",
                            draft.objectives.map((v, n) =>
                              n === i
                                ? { ...v, instructions: e.target.value }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className="text-link"
                      type="button"
                      onClick={() =>
                        update(
                          "objectives",
                          draft.objectives.filter((_, n) => i !== n),
                        )
                      }
                    >
                      Remove step
                    </button>
                  </div>
                ))}
                <button
                  className="button small"
                  type="button"
                  onClick={() =>
                    update("objectives", [
                      ...draft.objectives,
                      { title: "", instructions: "" },
                    ])
                  }
                >
                  Add step
                </button>
              </div>
            )}
            {draft.kind === "cheats" && (
              <div className="full">
                <h3>Verified platform inputs</h3>
                <p className="muted">
                  Enter exact source-supported inputs only. Codes cannot be
                  saved for demo or unverified records.
                </p>
                {(["PS5", "Xbox", "Phone"] as const).map((platform) => (
                  <label key={platform}>
                    {platform}
                    <input
                      value={
                        draft.codes.find((c) => c.platform === platform)
                          ?.code || ""
                      }
                      onChange={(e) =>
                        update("codes", [
                          ...draft.codes.filter((c) => c.platform !== platform),
                          ...(e.target.value
                            ? [{ platform, code: e.target.value }]
                            : []),
                        ])
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            <label>
              Attach source
              <select
                value={draft.source_id || ""}
                onChange={(e) =>
                  update("source_id", e.target.value || undefined)
                }
              >
                <option value="">Keep existing sources / no new source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fact this source supports
              <input
                value={draft.fact || ""}
                onChange={(e) => update("fact", e.target.value)}
              />
            </label>
            <label>
              Verification
              <select
                value={draft.verification}
                onChange={(e) =>
                  update(
                    "verification",
                    e.target.value as Entity["verification"],
                  )
                }
              >
                {verifications.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Publication status
              <select
                value={draft.status}
                onChange={(e) =>
                  update("status", e.target.value as Draft["status"])
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!draft.is_demo}
                onChange={(e) => update("is_demo", +e.target.checked)}
              />
              Fictional DEMO record
            </label>
            <div />
            <label>
              SEO title
              <input
                maxLength={160}
                value={draft.seo_title || ""}
                onChange={(e) => update("seo_title", e.target.value)}
              />
            </label>
            <label>
              Meta description
              <input
                maxLength={320}
                value={draft.meta_description || ""}
                onChange={(e) => update("meta_description", e.target.value)}
              />
            </label>
            <label className="full">
              Spoiler level
              <select
                value={draft.spoiler_level ?? 0}
                onChange={(e) =>
                  update("spoiler_level", Number(e.target.value))
                }
              >
                <option value={0}>0 — nothing to hide</option>
                <option value={1}>1 — minor gameplay detail</option>
                <option value={2}>2 — story content</option>
              </select>
              <small>
                Levels 1 and 2 are concealed by default. Readers lift them with
                their own spoiler setting, their story position, or a one-off
                reveal.
              </small>
            </label>
            {Number(draft.spoiler_level) > 0 && (
              <>
                <label>
                  Spoiler category
                  <select
                    value={draft.spoiler_category || ""}
                    onChange={(e) => update("spoiler_category", e.target.value)}
                  >
                    <option value="">Choose a category…</option>
                    {spoilerCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <small>
                    Required before publishing. Readers opt in one category at a
                    time.
                  </small>
                </label>
                <label>
                  Stops being a spoiler after mission #
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft.reveal_after_sequence ?? ""}
                    onChange={(e) =>
                      update(
                        "reveal_after_sequence",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                  <small>
                    Optional. A reader who has played at least this far sees the
                    record without changing any setting.
                  </small>
                </label>
                <label className="full">
                  Safe title
                  <input
                    maxLength={140}
                    value={draft.safe_title || ""}
                    onChange={(e) => update("safe_title", e.target.value)}
                    placeholder="What a reader sees instead of the real title"
                  />
                  <small>
                    The real title is never sent while this record is concealed.
                    Without a safe title readers see a generic label.
                  </small>
                </label>
                <label className="full">
                  Safe description
                  <input
                    maxLength={500}
                    value={draft.safe_description || ""}
                    onChange={(e) => update("safe_description", e.target.value)}
                    placeholder="A spoiler-free line describing what is hidden"
                  />
                </label>
              </>
            )}
          </div>
          <div className="editor-actions">
            <button disabled={busy} className="button primary" type="submit">
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              disabled={busy}
              className="button"
              type="button"
              onClick={() => save({ ...draft, status: "draft" })}
            >
              Save as draft
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {revisions.length > 0 && (
        <details>
          <summary>Revision history · Rollback creates a new draft</summary>
          {revisions.map((r) => (
            <div className="revision-row" key={r.revision}>
              <span>
                Revision {r.revision} · {r.created_at}
                <small>{r.changes}</small>
              </span>
              <button
                disabled={busy || r.revision === draft.revision}
                className="button small"
                onClick={async () => {
                  setBusy(true);
                  const response = await fetch("/api/admin/rollback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: draft.id,
                      revision: r.revision,
                      current_revision: draft.revision,
                    }),
                  });
                  const data = await response.json();
                  setBusy(false);
                  if (response.ok) {
                    setMessage(
                      "Restored as a new draft. Reopen the editor to review.",
                    );
                    onSaved();
                    onClose();
                  } else setMessage(data.error);
                }}
              >
                Restore
              </button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
