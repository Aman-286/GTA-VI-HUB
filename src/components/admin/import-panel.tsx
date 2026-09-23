"use client";
import { useState } from "react";
export function ImportPanel({ onSaved }: { onSaved: () => void }) {
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<{
      rows?: { title: string; kind: string; slug: string }[];
      errors?: string[];
      imported?: number;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(confirm: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, confirm }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setPreview(data);
      if (data.imported) onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor-panel">
      <h2>Import content</h2>
      <p className="muted">
        Up to 50 rows, 200 KB. Every record imports as an unverified draft.
        Existing slugs are never overwritten.
      </p>
      <a href="/import-template.csv" className="text-link" download>
        Download CSV template ↓
      </a>
      <label>
        Choose CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setPreview(null);
            if (f) {
              if (f.size > 200000) {
                setError("Choose a CSV file smaller than 200 KB.");
                return;
              }
              setCsv(await f.text());
            }
          }}
        />
      </label>
      <label>
        Or paste CSV
        <textarea
          rows={8}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setPreview(null);
          }}
        />
      </label>
      <button
        disabled={busy || !csv}
        className="button"
        onClick={() => run(false)}
      >
        Validate & preview
      </button>
      {preview?.errors?.map((e, i) => (
        <p className="form-message" role="alert" key={i}>
          {e}
        </p>
      ))}
      {preview?.rows && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.kind}</td>
                  <td>{r.title}</td>
                  <td>{r.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!preview.errors?.length && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => run(true)}
            >
              Confirm import of {preview.rows.length} drafts
            </button>
          )}
        </>
      )}
      {!!preview?.imported && (
        <p role="status" className="notice">
          Imported {preview.imported} drafts. Review them before publication.
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </section>
  );
}
