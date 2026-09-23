"use client";
/* JSON exports require a full browser navigation, without Next prefetch. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import { AccountAuth } from "./account-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entity, User } from "@/types/content";
import { useProgress } from "@/hooks/use-progress";
import { EntityRow, EmptyState } from "@/components/ui";
export function AccountDashboard({
  user,
  items,
}: {
  user: User | null;
  items: Entity[];
}) {
  const { completed, favorites, recent, error } = useProgress();
  const [tab, setTab] = useState("favorites"),
    [message, setMessage] = useState("");
  const router = useRouter();
  const found = items.filter((e) => completed.has(e.id)).length;
  const list =
    tab === "recent"
      ? recent
      : items.filter((e) =>
          tab === "favorites"
            ? favorites.has(e.id)
            : tab === "guides"
              ? e.kind === "guides" && favorites.has(e.id)
              : completed.has(e.id),
        );
  const tabs = [
    { id: "favorites", label: "Favorites", count: favorites.size },
    { id: "completed", label: "Completed", count: completed.size },
    { id: "recent", label: "Recently viewed", count: recent.length },
    {
      id: "guides",
      label: "Saved guides",
      count: items.filter((e) => e.kind === "guides" && favorites.has(e.id))
        .length,
    },
  ];
  const empty = {
    favorites: {
      title: "Keep something for later.",
      body: "Save a guide, vehicle or map location to find it here.",
    },
    completed: {
      title: "Your journey starts with a discovery.",
      body: "Mark records complete as you explore the companion.",
    },
    recent: {
      title: "Nothing viewed yet.",
      body: "Records you open will show up here so you can pick up where you left off.",
    },
    guides: {
      title: "No saved guides.",
      body: "Favorite a guide and it will be waiting for you here.",
    },
  }[tab] ?? {
    title: "Nothing here yet.",
    body: "Explore the companion to start building this list.",
  };
  return (
    <>
      <div className="notice">
        {user?.email || user?.github_id
          ? `Signed in as ${user.username}. Your checklist is available on any device when you sign in.`
          : "You’re exploring as a guest. Progress is stored on our server for this browser. Sign in to keep it across devices; clearing cookies loses access to a guest checklist."}
      </div>
      {!(user?.email || user?.github_id) ? (
        <AccountAuth />
      ) : (
        <div className="entity-actions">
          <button
            className="button"
            onClick={async () => {
              const r = await fetch("/api/session", { method: "DELETE" });
              if (r.ok) {
                location.reload();
              } else setMessage("Sign out failed. Please try again.");
            }}
          >
            Sign out
          </button>
          {user.roles.some((r) => ["admin", "editor"].includes(r)) && (
            <Link className="button" href="/admin">
              Open editorial workspace
            </Link>
          )}
        </div>
      )}
      <div className="progress-summary">
        <p className="muted">
          Totals and saved lists follow your spoiler settings.
        </p>
        <div className="heading-row">
          <div>
            <p className="eyebrow">YOUR COMPANION CHECKLIST</p>
            <p>
              <strong>{found}</strong>
              <span className="muted">
                {" "}
                / {items.length} available records completed
              </span>
            </p>
          </div>
          <span className="badge demo">INCLUDES DEMO DATA</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Companion completion"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={found}
        >
          <span
            style={{
              width: `${items.length ? (found / items.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Your checklist">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`checklist-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls="checklist-panel"
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label} · {t.count}
          </button>
        ))}
      </div>
      <div
        key={tab}
        id="checklist-panel"
        className="tab-panel"
        role="tabpanel"
        aria-labelledby={`checklist-tab-${tab}`}
        tabIndex={-1}
      >
        {list.length ? (
          list.map((e) => <EntityRow key={e.id} entity={e} />)
        ) : (
          <EmptyState title={empty.title}>
            <p>{empty.body}</p>
            <Link className="button" href="/gta-6/map">
              Explore the map
            </Link>
          </EmptyState>
        )}
      </div>
      {(user?.email || user?.github_id) && (
        <details className="account-settings">
          <summary>Account settings</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const r = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  display_name: data.get("display_name"),
                }),
              });
              const body = await r.json();
              setMessage(r.ok ? "Profile updated." : body.error);
              router.refresh();
            }}
          >
            <label>
              Display name
              <input
                name="display_name"
                defaultValue={user.username}
                minLength={2}
                maxLength={80}
              />
            </label>
            <button className="button" type="submit">
              Save profile
            </button>
          </form>
          {user.email && <AccountAuth email={user.email} />}
          <a className="text-link" href="/api/account">
            Export my data (JSON)
          </a>
        </details>
      )}
      {(error || message) && (
        <p role="status" className="form-message">
          {error || message}
        </p>
      )}
    </>
  );
}
