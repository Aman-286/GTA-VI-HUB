"use client";
import { useState } from "react";
import Script from "next/script";
import { kinds, labels } from "@/types/content";
import { guestSession } from "@/hooks/use-progress";
export function SubmissionForm({
  initialTitle = "",
  turnstileKey = "",
}: {
  initialTitle?: string;
  turnstileKey?: string;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        const form = e.currentTarget;
        const fields = new FormData(form);
        try {
          await guestSession();
          const r = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: fields.get("kind"),
              title: fields.get("title"),
              description: fields.get("description"),
              url: fields.get("url"),
              website: fields.get("website"),
              turnstileToken: fields.get("cf-turnstile-response") || undefined,
            }),
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          setSuccess(true);
          setMessage(
            `Submitted for review. Your reference is ${data.id.slice(0, 8)}. Nothing is published automatically.`,
          );
          form.reset();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Share your evidence.</h2>
      <div className="form-grid">
        <label>
          Type
          <select name="kind">
            {kinds.map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input
            name="title"
            defaultValue={initialTitle}
            required
            minLength={5}
            maxLength={140}
            placeholder="What did you find?"
          />
        </label>
        <label className="full">
          What should we know?
          <textarea
            name="description"
            rows={6}
            required
            minLength={30}
            maxLength={5000}
            placeholder="Describe the discovery or correction. Include the platform, version and steps to reproduce where relevant."
          />
        </label>
        <label className="full">
          Evidence link
          <input
            name="url"
            type="url"
            required
            maxLength={1000}
            placeholder="https://…"
          />
          <span>
            Link to a public source that supports your information. Please avoid
            personal details.
          </span>
        </label>
        <label className="sr-only" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {turnstileKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile"
            data-sitekey={turnstileKey}
            data-theme="dark"
            data-action="submission"
          />
        </>
      )}
      <button type="submit" className="button primary" disabled={busy}>
        {busy ? "Submitting…" : "Send for review"}
      </button>
      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        All submissions enter moderation. Approval never substitutes for source
        verification.
      </p>
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={`notice ${success ? "" : "error"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
