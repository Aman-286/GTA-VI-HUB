"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ArrowUpRight,
  LayoutDashboard,
  Database,
  Map,
  BookOpen,
  Inbox,
  BarChart3,
  Users,
  Settings,
  FileUp,
} from "lucide-react";
import { Entity, kinds, labels, entityUrl } from "@/types/content";
import { Badge } from "@/components/ui";
import { EntityEditor } from "./entity-editor";
import { ImportPanel } from "./import-panel";
import { MapEditor } from "./map-editor";
type Source = { id: string; title: string; url: string; type: string };
type Submission = {
  id: string;
  title: string;
  description: string;
  kind: string;
  url: string;
  status: string;
  review_note: string;
};
type Account = {
  id: string;
  username: string;
  github_id: string;
  email?: string;
  roles: string | null;
};
type Analytics = {
  searches: {
    query: string;
    frequency: number;
    zero_results: number;
    clicks: number;
  }[];
  favorites: { title: string; n: number }[];
  views: { title: string; n: number }[];
  reports: { title: string; n: number }[];
};
const sections = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["entities", "Content", Database],
  ["map", "Map editor", Map],
  ["sources", "Sources", BookOpen],
  ["submissions", "Submissions", Inbox],
  ["verification", "Verification", BookOpen],
  ["import", "CSV import", FileUp],
  ["analytics", "Analytics", BarChart3],
  ["users", "Users & contributors", Users],
  ["settings", "Settings", Settings],
] as const;
export function AdminWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const params = useSearchParams(),
    router = useRouter(),
    section = params.get("section") || "dashboard";
  const [entities, setEntities] = useState<Entity[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [accounts, setAccounts] = useState<Account[]>([]),
    [analytics, setAnalytics] = useState<Analytics | null>(null),
    [editor, setEditor] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const endpoints = [
        "entities",
        "sources",
        "submissions",
        ...(section === "analytics" ? ["analytics"] : []),
        ...(section === "users" && isAdmin ? ["users"] : []),
      ];
      const data = await Promise.all(
        endpoints.map(async (path) => {
          const r = await fetch(`/api/admin/${path}`);
          const b = await r.json();
          if (!r.ok) throw Error(b.error);
          return [path, b] as const;
        }),
      );
      for (const [key, value] of data) {
        if (key === "entities") setEntities(value.items);
        if (key === "sources") setSources(value.items);
        if (key === "submissions") setSubmissions(value.items);
        if (key === "users") setAccounts(value.items);
        if (key === "analytics") setAnalytics(value);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [section, isAdmin]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  function nav(next: string) {
    router.replace(`/admin?section=${next}`);
    setEditor(null);
    setMessage("");
  }
  async function post(resource: string, body: unknown) {
    try {
      const r = await fetch(`/api/admin/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(d.message || "Changes saved.");
      void refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  const filtered = entities.filter(
    (e) =>
      (!kind || kind === e.kind) &&
      (!status || status === e.status) &&
      e.title.toLowerCase().includes(query.toLowerCase()) &&
      (section !== "verification" || e.verification === "Unverified"),
  );
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <p className="eyebrow">EDITORIAL WORKSPACE</p>
        {sections
          .filter((s) => s[0] !== "users" || isAdmin)
          .map(([key, label, Icon]) => (
            <button
              className={section === key ? "active" : ""}
              key={key}
              onClick={() => nav(key)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        <Link href="/">
          View public site
          <ArrowUpRight size={15} />
        </Link>
      </aside>
      <div className="admin-main">
        <div className="heading-row admin-heading">
          <div>
            <p className="eyebrow">GTA VI HUB / EDITORIAL</p>
            <h1>
              {sections.find((s) => s[0] === section)?.[1] || "Dashboard"}
            </h1>
          </div>
          <button
            className="button primary"
            onClick={() => {
              nav("entities");
              setEditor("new");
            }}
          >
            <Plus size={16} />
            Create record
          </button>
        </div>
        {error && (
          <div role="alert" className="notice error">
            {error}
            <button className="text-link" onClick={() => refresh()}>
              Retry
            </button>
          </div>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {loading && !entities.length && (
          <div className="skeleton-page">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
        {editor !== null ? (
          <EntityEditor
            key={editor}
            id={editor === "new" ? undefined : editor}
            onClose={() => setEditor(null)}
            onSaved={() => refresh()}
          />
        ) : (
          <>
            {section === "dashboard" && (
              <>
                <div className="admin-stats">
                  {[
                    [
                      "Published",
                      entities.filter((e) => e.status === "published").length,
                    ],
                    [
                      "Drafts",
                      entities.filter((e) => e.status === "draft").length,
                    ],
                    [
                      "Pending review",
                      submissions.filter((s) => s.status === "pending").length,
                    ],
                    ["Sources", sources.length],
                  ].map(([label, count]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <div className="editor-panel">
                  <h2>Ready for your attention</h2>
                  <p className="muted">
                    Review evidence before verification. Every publication
                    leaves a revision and audit trail.
                  </p>
                  <div className="admin-shortcuts">
                    <button onClick={() => nav("submissions")}>
                      Review community submissions →
                    </button>
                    <button onClick={() => nav("verification")}>
                      Check unverified records →
                    </button>
                    <button onClick={() => nav("analytics")}>
                      Find gaps in search results →
                    </button>
                  </div>
                </div>
                <h2 className="admin-subheading">Recently edited</h2>
                {entities.slice(0, 8).map((e) => (
                  <button
                    className="admin-content-row"
                    key={e.id}
                    onClick={() => setEditor(e.id)}
                  >
                    <span>
                      {e.title}
                      <small>
                        {labels[e.kind]} · Revision {e.revision}
                      </small>
                    </span>
                    <span className="badge neutral">{e.status}</span>
                  </button>
                ))}
              </>
            )}
            {["entities", "verification"].includes(section) && (
              <>
                <div className="toolbar">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a record…"
                    aria-label="Filter content"
                  />
                  <select
                    aria-label="Record type"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">All types</option>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {labels[k]}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Publication status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option>draft</option>
                    <option>published</option>
                    <option>archived</option>
                  </select>
                </div>
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Verification</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <button
                              className="table-title"
                              onClick={() => setEditor(e.id)}
                            >
                              {e.title}
                            </button>
                            <small>{e.slug}</small>
                          </td>
                          <td>{labels[e.kind]}</td>
                          <td>
                            <Badge entity={e} />
                          </td>
                          <td>{e.status}</td>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setEditor(e.id)}
                            >
                              Edit
                            </button>
                            {e.status === "published" && (
                              <Link
                                className="icon-button"
                                aria-label={`Open ${e.title}`}
                                href={entityUrl(e)}
                              >
                                <ArrowUpRight size={15} />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <p className="notice">No records match these filters.</p>
                )}
                <p className="muted admin-limit">
                  Showing the latest 100 records. Use the database export for
                  larger editorial audits.
                </p>
              </>
            )}
            {section === "map" && <MapEditor entities={entities} />}{" "}
            {section === "import" && <ImportPanel onSaved={() => refresh()} />}{" "}
            {section === "sources" && (
              <>
                <form
                  className="editor-panel"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    if (
                      await post(
                        "sources",
                        Object.fromEntries(new FormData(form)),
                      )
                    )
                      form.reset();
                  }}
                >
                  <h2>Add a source</h2>
                  <div className="form-grid">
                    <label>
                      Source title
                      <input
                        name="title"
                        required
                        minLength={3}
                        maxLength={200}
                      />
                    </label>
                    <label>
                      Source type
                      <select name="type">
                        {[
                          "Official",
                          "Own Gameplay",
                          "Community",
                          "Publication",
                          "Video",
                          "Forum",
                          "Social",
                          "Other",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label className="full">
                      URL
                      <input name="url" type="url" required />
                    </label>
                    <label className="full">
                      Editorial notes
                      <textarea name="notes" rows={3} />
                    </label>
                  </div>
                  <button className="button primary" type="submit">
                    Add source
                  </button>
                </form>
                {sources.map((s) => (
                  <div className="admin-content-row" key={s.id}>
                    <span>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title} ↗
                      </a>
                      <small>{s.id}</small>
                    </span>
                    <span className="badge neutral">{s.type}</span>
                  </div>
                ))}
              </>
            )}
            {section === "submissions" && (
              <>
                {submissions.length ? (
                  submissions.map((s) => (
                    <div className="editor-panel" key={s.id}>
                      <div className="heading-row">
                        <h2>{s.title}</h2>
                        <span className="badge neutral">{s.status}</span>
                      </div>
                      <p className="muted">{s.description}</p>
                      <a
                        className="text-link"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Review evidence ↗
                      </a>
                      {s.status === "pending" ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void post("submissions", {
                              id: s.id,
                              status: f.get("status"),
                              note: f.get("note"),
                            });
                          }}
                        >
                          <label>
                            Review note
                            <textarea name="note" required minLength={5} />
                          </label>
                          <label>
                            Decision
                            <select name="status">
                              <option value="approved">
                                Approve contribution (does not publish)
                              </option>
                              <option value="rejected">Reject</option>
                            </select>
                          </label>
                          <button className="button" type="submit">
                            Record decision
                          </button>
                        </form>
                      ) : (
                        <p className="notice">{s.review_note}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <h2>The review queue is clear.</h2>
                    <p className="muted">
                      New community submissions will appear here.
                    </p>
                  </div>
                )}
              </>
            )}
            {section === "analytics" && analytics && (
              <>
                <div className="editor-panel">
                  <h2>Search demand · Last 30 days</h2>
                  <p className="muted">
                    Aggregate submitted searches. No query keystrokes or
                    personal identifiers are stored.
                  </p>
                  <div className="table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Query</th>
                          <th>Searches</th>
                          <th>No result</th>
                          <th>Clicks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.searches.map((a) => (
                          <tr key={a.query}>
                            <td>{a.query}</td>
                            <td>{a.frequency}</td>
                            <td>{a.zero_results}</td>
                            <td>{a.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!analytics.searches.length && (
                    <p className="notice">No search activity recorded yet.</p>
                  )}
                </div>
                {(["favorites", "views", "reports"] as const).map((k) => (
                  <div className="editor-panel" key={k}>
                    <h2>
                      Most{" "}
                      {k === "views"
                        ? "viewed"
                        : k === "reports"
                          ? "reported"
                          : "favorited"}
                    </h2>
                    {analytics[k].map((a) => (
                      <div className="admin-content-row" key={a.title}>
                        <span>{a.title}</span>
                        <span>{a.n}</span>
                      </div>
                    ))}
                    {!analytics[k].length && (
                      <p className="muted">No activity yet.</p>
                    )}
                  </div>
                ))}
              </>
            )}
            {section === "users" &&
              isAdmin &&
              accounts.map((a) => (
                <div className="editor-panel" key={a.id}>
                  <h2>{a.username}</h2>
                  <p className="muted">Account: {a.email || a.username}</p>
                  {["admin", "editor", "contributor"].map((r) => (
                    <label className="checkbox-label" key={r}>
                      <input
                        type="checkbox"
                        checked={a.roles?.split(",").includes(r) || false}
                        onChange={(e) =>
                          post("roles", {
                            user_id: a.id,
                            role: r,
                            enabled: e.target.checked,
                          })
                        }
                      />
                      {r}
                    </label>
                  ))}
                </div>
              ))}
            {section === "settings" && (
              <div className="editor-panel">
                <h2>Deployment settings</h2>
                <p className="muted">
                  Sensitive settings are managed as Cloudflare environment
                  bindings, outside the public application.
                </p>
                <dl className="settings-list">
                  <dt>Database</dt>
                  <dd>Cloudflare D1 · DB</dd>
                  <dt>Authentication</dt>
                  <dd>GitHub OAuth · identity only</dd>
                  <dt>Uploads</dt>
                  <dd>
                    Disabled by default to preserve the zero-cost requirement
                  </dd>
                  <dt>AI</dt>
                  <dd>Disabled · no API dependency</dd>
                  <dt>Verification</dt>
                  <dd>Editor-reviewed, linked sources required</dd>
                  <dt>Administrator bootstrap</dt>
                  <dd>Immutable GitHub IDs in ADMIN_GITHUB_IDS</dd>
                </dl>
                <Link className="text-link" href="/content-guidelines">
                  View content guidelines →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
