import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntity, getSources } from "@/lib/db/content";
import { rows, first } from "@/lib/db";
import { Entity, labels, entityUrl, Kind } from "@/types/content";
import { Breadcrumbs, Badge } from "@/components/ui";
import { EyeOff } from "lucide-react";
import { RecentView } from "@/components/entities/recent-view";
import { spoilerContext } from "@/lib/spoilers/context";
import {
  concealmentReason,
  isConcealed,
  placeholderTitle,
} from "@/lib/spoilers/policy";
import { SpoilerGate } from "@/components/spoilers/spoiler-gate";
import { ContentRow } from "@/components/spoilers/spoiler-row";
import { concealed } from "@/lib/db/content";
import { EntityActions } from "@/components/entities/entity-actions";
import { serializeStructuredData } from "@/lib/structured-data";
type Params = Promise<{ kind: string; slug: string }>;
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { kind, slug } = await params;
  const e = await getEntity(kind, slug);
  if (!e) return { title: "Not found" };
  // A page title and an Open Graph card are the two places a spoiler escapes
  // most easily -- into the tab strip, the browser history, and the link
  // preview of every chat app the URL is pasted into. A concealed record
  // publishes only its safe stand-in and is withheld from indexing.
  if (isConcealed(e, await spoilerContext())) {
    const safe = e.safe_title?.trim() || placeholderTitle(e);
    return {
      title: safe,
      description: "Hidden to match your spoiler setting.",
      alternates: { canonical: entityUrl(e) },
      robots: { index: false, follow: false },
      openGraph: { title: safe, description: "", type: "article", images: [] },
    };
  }
  return {
    title: e.seo_title || e.title,
    description: e.meta_description || e.description,
    alternates: { canonical: entityUrl(e) },
    robots: { index: !e.is_demo, follow: true },
    openGraph: {
      title: e.title,
      description: e.description,
      type: "article",
      images: [],
    },
  };
}
export default async function EntityDetail({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ reveal?: string }>;
}) {
  const { kind, slug } = await params;
  const e = await getEntity(kind, slug);
  if (!e) notFound();

  // The gate is decided before any of the record's content is fetched, so a
  // concealed page costs one query and renders nothing it is hiding.
  const { reveal } = await searchParams;
  const context = await spoilerContext();
  if (reveal !== "1" && isConcealed(e, context)) {
    const category = (e.spoiler_category || "").trim();
    const categoryRow = category
      ? await first<{ name: string }>(
          "SELECT name FROM spoiler_categories WHERE id=?",
          category,
        )
      : null;
    return (
      <div className="container page-content">
        <Breadcrumbs
          items={[{ label: labels[kind as Kind], href: `/gta-6/${kind}` }]}
        />
        <SpoilerGate
          title={e.safe_title?.trim() || placeholderTitle(e)}
          reason={concealmentReason(e)}
          category={category}
          categoryName={categoryRow?.name || "this category"}
        />
      </div>
    );
  }
  const revealedOnce = reveal === "1" && isConcealed(e, context);

  const [sources, markers, related] = await Promise.all([
    getSources(e.id),
    rows<{ id: string; x: number; y: number }>(
      "SELECT id,x,y FROM map_markers WHERE entity_id=?",
      e.id,
    ),
    rows<Entity>(
      "SELECT e.* FROM entities e JOIN entity_relations r ON e.id=r.related_id WHERE r.entity_id=? AND e.status='published' LIMIT 8",
      e.id,
    ),
  ]);
  const objectives =
    kind === "missions"
      ? await rows<{ position: number; title: string; instructions: string }>(
          "SELECT * FROM mission_objectives WHERE mission_id=? ORDER BY position",
          e.id,
        )
      : [];
  const domain = [
    "missions",
    "vehicles",
    "weapons",
    "properties",
    "businesses",
    "activities",
    "achievements",
  ].includes(kind)
    ? await first<Record<string, string | number | null>>(
        `SELECT * FROM ${kind} WHERE entity_id=?`,
        e.id,
      )
    : null;
  const stats =
    kind === "vehicles"
      ? ["speed", "acceleration", "handling", "braking", "seats", "price"]
      : kind === "weapons"
        ? ["damage", "range", "accuracy", "fire_rate", "magazine"]
        : [];
  const sections =
    kind === "missions"
      ? ["requirements", "rewards", "unlocks", "tips", "missables"]
      : kind === "vehicles"
        ? ["obtain", "customization"]
        : kind === "weapons"
          ? ["obtain", "requirements", "attachments"]
          : ["requirements"];
  const neighbors =
    kind === "missions"
      ? await rows<Entity>(
          "SELECT e.* FROM entities e JOIN missions m ON e.id=m.entity_id WHERE e.status='published' AND e.id!=? ORDER BY m.sequence LIMIT 2",
          e.id,
        )
      : [];
  const [relatedViews, neighborViews] = await Promise.all([
    concealed(related),
    concealed(neighbors),
  ]);
  return (
    <div className="container page-content">
      <Breadcrumbs
        items={[
          { label: labels[kind as Kind], href: `/gta-6/${kind}` },
          { label: e.title },
        ]}
      />
      {revealedOnce && (
        <div className="notice spoiler-notice" role="status">
          <EyeOff size={15} aria-hidden="true" />
          <span>
            You opened this record past your spoiler setting. It stays hidden
            everywhere else.
          </span>
        </div>
      )}
      <header className="page-heading">
        <p className="eyebrow">{e.category || labels[e.kind]}</p>
        <h1>{e.title}</h1>
        <p>{e.description}</p>
        <div style={{ marginTop: 16 }}>
          <Badge entity={e} />
          <span className="muted" style={{ fontSize: 12, marginLeft: 12 }}>
            Revision {e.revision} · Updated {e.updated_at.slice(0, 10)}
          </span>
        </div>
      </header>
      {!!e.is_demo && (
        <div className="notice">
          <strong>Demonstration record.</strong> This page contains fictional
          sample information. It is not a GTA VI mission, item, location or
          gameplay guide.
        </div>
      )}
      <RecentView id={e.id} />
      <EntityActions id={e.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item:
                  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: labels[e.kind],
                item: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/gta-6/${e.kind}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: e.title,
                item: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}${entityUrl(e)}`,
              },
            ],
          }),
        }}
      />
      <div className="article-layout">
        <article className="article-body">
          <section id="overview">
            <h2>Overview</h2>
            {e.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
          {stats.length > 0 && (
            <section id="specifications">
              <h2>Specifications</h2>
              <div className="stats-grid">
                {stats.map((s) => (
                  <div key={s} className="stat-cell">
                    <small>{s.replaceAll("_", " ").toUpperCase()}</small>
                    <strong>{domain?.[s] ?? "Not confirmed"}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
          {objectives.length > 0 && (
            <section id="walkthrough">
              <h2>Walkthrough</h2>
              {objectives.map((o) => (
                <div className="walkthrough-step" key={o.position}>
                  <span>{String(o.position).padStart(2, "0")}</span>
                  <div>
                    <h3>{o.title}</h3>
                    <p>{o.instructions}</p>
                  </div>
                </div>
              ))}
            </section>
          )}
          {sections
            .filter((s) => domain?.[s])
            .map((s) => (
              <section key={s} id={s}>
                <h2>
                  {s === "obtain"
                    ? "How to obtain"
                    : s === "missables"
                      ? "Missable content"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                </h2>
                <p>{domain?.[s]}</p>
              </section>
            ))}
          <section id="locations">
            <h2>Map locations</h2>
            {markers.length ? (
              markers.map((m) => (
                <Link
                  key={m.id}
                  className="button"
                  href={`/gta-6/map?marker=${m.id}&category=${kind}`}
                >
                  View on {e.is_demo ? "demo " : ""}map · X {m.x} / Y {m.y}
                </Link>
              ))
            ) : (
              <p>No sourced map locations are attached to this record.</p>
            )}
          </section>
          <section id="sources">
            <h2>Sources & verification</h2>
            {sources.length ? (
              <div className="source-list">
                {sources.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.title} ↗
                    <small>
                      {s.type} · Supports: {s.fact}
                    </small>
                  </a>
                ))}
              </div>
            ) : (
              <p>
                {e.is_demo
                  ? "Fictional demo records have no gameplay sources."
                  : "This editorial guide explains the companion itself. It does not assert unconfirmed game information."}
              </p>
            )}
            <Link
              className="text-link"
              href={`/submit?title=${encodeURIComponent(`Correction: ${e.title}`)}`}
            >
              Suggest a correction →
            </Link>
          </section>
          {related.length > 0 && (
            <section>
              <h2>Related records</h2>
              {relatedViews.map((r) => (
                <ContentRow entity={r} key={r.id} />
              ))}
            </section>
          )}
          {neighbors.length > 0 && (
            <section>
              <h2>Continue browsing missions</h2>
              {neighborViews.map((r) => (
                <ContentRow entity={r} key={r.id} />
              ))}
            </section>
          )}
        </article>
        <aside className="article-aside">
          <h3>On this page</h3>
          <nav aria-label="On this page">
            <a href="#overview">Overview</a>
            {stats.length > 0 && <a href="#specifications">Specifications</a>}
            {objectives.length > 0 && <a href="#walkthrough">Walkthrough</a>}
            <a href="#locations">Map locations</a>
            <a href="#sources">Sources & verification</a>
          </nav>
          <Link href="/gta-6/map" className="button">
            Open interactive map
          </Link>
        </aside>
      </div>
    </div>
  );
}
