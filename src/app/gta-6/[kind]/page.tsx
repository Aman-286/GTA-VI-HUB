import Link from "next/link";
import { OfficialBanner } from "@/components/official-banner";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { kinds, labels, Kind } from "@/types/content";
import { listEntities } from "@/lib/db/content";
import { rows } from "@/lib/db";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { ContentRow } from "@/components/spoilers/spoiler-row";
import { SpoilerNotice } from "@/components/spoilers/spoiler-notice";
import { spoilerContext } from "@/lib/spoilers/context";
import { visibleClause } from "@/lib/spoilers/sql";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  return {
    title: `GTA VI ${labels[kind as Kind] || "Database"}`,
    alternates: { canonical: `/gta-6/${kind}` },
    description: `Browse the GTA VI ${kind} companion database. Demo entries are clearly labeled; verified information includes sources.`,
  };
}
export default async function Listing({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    category?: string;
    class?: string;
    sort?: string;
  }>;
}) {
  const { kind } = await params;
  if (!kinds.includes(kind as Kind)) notFound();
  const {
    q = "",
    page: pageString,
    category: cat = "",
    class: vehicleClass = "",
    sort = "updated",
  } = await searchParams;
  const category = cat || vehicleClass;
  const page = Math.max(1, Math.min(1000, Math.floor(Number(pageString) || 1)));
  const visible = visibleClause(await spoilerContext());
  const categories = await rows<{ category: string }>(
    `SELECT DISTINCT e.category FROM entities e WHERE e.kind=? AND e.status='published' AND e.category!='' AND ${visible.clause} ORDER BY e.category`,
    kind,
    ...visible.args,
  );
  const { items, total, hidden } = await listEntities(
    kind as Kind,
    q.slice(0, 120),
    page,
    category,
    sort,
  );
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ label: labels[kind as Kind] }]} />
      <div className="page-heading">
        <p className="eyebrow">THE GTA VI DATABASE</p>
        <h1>{labels[kind as Kind]}</h1>
        <p>
          Find the details. Follow the evidence. Keep track of what you
          discover.
        </p>
      </div>
      {["characters", "missions", "locations", "guides"].includes(kind) && (
        <OfficialBanner kind={kind} />
      )}
      <div className="notice">
        Game information is still being assembled. Records labeled DEMO are
        fictional examples, not confirmed GTA VI content.
      </div>
      <form className="toolbar">
        <input
          name="q"
          defaultValue={q}
          placeholder={`Search ${labels[kind as Kind].toLowerCase()}…`}
          aria-label={`Search ${kind}`}
        />
        <select
          name="category"
          aria-label="Filter category"
          defaultValue={category}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.category}>{c.category}</option>
          ))}
        </select>
        <select name="sort" aria-label="Sort records" defaultValue={sort}>
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
          {kind === "vehicles" && (
            <option value="speed">Speed · known first</option>
          )}
        </select>
        <button className="button primary" type="submit">
          Search
        </button>
        {q && (
          <Link className="text-link" href={`/gta-6/${kind}`}>
            Clear
          </Link>
        )}
        <span className="count">
          {total} {total === 1 ? "record" : "records"}
        </span>
      </form>
      <SpoilerNotice hidden={hidden} noun="record" />
      {items.length ? (
        items.map((e) => <ContentRow entity={e} key={e.id} />)
      ) : (
        <EmptyState
          title={
            q ? `No results for “${q}”` : "The next discovery belongs here."
          }
        >
          <p>
            {q
              ? "Try a different term, or help us fill a gap in the database."
              : "We’ll add useful information when it can be supported by evidence."}
          </p>
          <Link href="/submit" className="button">
            Submit information
          </Link>
        </EmptyState>
      )}
      {total > 24 && (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 && (
            <Link
              className="button"
              href={`?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&page=${page - 1}`}
            >
              Previous
            </Link>
          )}
          <span>
            Page {page} of {Math.ceil(total / 24)}
          </span>
          {page * 24 < total && (
            <Link
              className="button"
              href={`?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
