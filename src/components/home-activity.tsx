import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { rows } from "@/lib/db";
import { SectionHeading, EntityRow } from "./ui";
import type { Entity } from "@/types/content";
import { spoilerContext } from "@/lib/spoilers/context";
import { visibleClause } from "@/lib/spoilers/sql";
export async function HomeActivity() {
  const context = await spoilerContext();
  const visible = visibleClause(context);
  const [verified, trending] = await Promise.all([
    rows<Entity>(
      `SELECT e.* FROM entities e WHERE e.status='published' AND e.is_demo=0 AND e.verification IN ('Official','Verified','Community Verified') AND ${visible.clause} ORDER BY e.updated_at DESC LIMIT 4`,
      ...visible.args,
    ),
    context.mode === "all"
      ? rows<{ query: string; n: number }>(
          "SELECT query,COUNT(*) n FROM search_events WHERE created_at>datetime('now','-7 days') GROUP BY query HAVING COUNT(*)>=3 ORDER BY n DESC LIMIT 5",
        )
      : Promise.resolve([]),
  ]);
  return (
    <>
      <section>
        <SectionHeading
          eyebrow="FROM THE EDITORIAL DESK"
          title="Latest verified discoveries"
          href="/content-guidelines"
          link="Our standards"
        />
        {verified.length ? (
          verified.map((e) => <EntityRow key={e.id} entity={e} />)
        ) : (
          <div className="quiet-empty">
            <span className="status-dot" />
            <p>
              Good information is worth waiting for.
              <br />
              <span className="muted">
                New discoveries will appear here once their evidence has been
                reviewed.
              </span>
            </p>
            <Link href="/submit" className="text-link">
              Share a source
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section>
        <SectionHeading
          eyebrow="WHAT PLAYERS ARE LOOKING FOR"
          title="Trending searches"
        />
        {trending.length ? (
          <div className="trending-list">
            {trending.map((t, i) => (
              <Link
                key={t.query}
                href={`/search?q=${encodeURIComponent(t.query)}`}
              >
                <span>0{i + 1}</span>
                <strong>{t.query}</strong>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="quiet-empty">
            <span className="status-dot" />
            <p>
              {context.mode === "all"
                ? "Trending searches will appear as players use the companion."
                : "Trending search terms are hidden while spoiler protection is enabled."}
              <br />
              <span className="muted">
                Counted from real use only. No manufactured rankings.
              </span>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
