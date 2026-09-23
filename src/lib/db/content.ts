import { first, rows } from "./index";
import type { Entity, Kind, Source } from "@/types/content";
import { spoilerContext } from "@/lib/spoilers/context";
import { concealAll, withheld, type EntityView } from "@/lib/spoilers/conceal";
import { visibleClause } from "@/lib/spoilers/sql";

/**
 * Concealment is applied here rather than in each page, so a surface added
 * later cannot forget it. The two read paths treat a hidden record
 * differently, on purpose:
 *
 *   listings  keep the row and replace its contents, because a browsable
 *             database with silent gaps is confusing and the reader is owed a
 *             control to lift the cover;
 *   search    drop the row entirely, because a full-text match can be caused
 *             by a word that only exists in the hidden body -- returning even
 *             a masked row would confirm that the search term matched, which
 *             is itself the spoiler.
 */
export async function listEntities(
  kind?: Kind,
  query = "",
  page = 1,
  category = "",
  sort = "updated",
): Promise<{ items: EntityView[]; total: number; hidden: number }> {
  const where = ["status='published'"];
  const args: unknown[] = [];
  if (kind) {
    where.push("kind=?");
    args.push(kind);
  }
  if (query) {
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    args.push(`%${escaped}%`, `%${escaped}%`);
  }
  if (category) {
    where.push("category=?");
    args.push(category);
  }
  const context = await spoilerContext();
  if (query || category) {
    const visible = visibleClause(context, "entities");
    where.push(visible.clause);
    args.push(...visible.args);
  }
  const clause = where.join(" AND ");
  const order =
    sort === "name"
      ? "title ASC"
      : sort === "speed" && kind === "vehicles"
        ? "(SELECT v.speed FROM vehicles v WHERE v.entity_id=entities.id) DESC NULLS LAST,title"
        : "updated_at DESC,title";
  const [found, total] = await Promise.all([
    rows<Entity>(
      `SELECT * FROM entities WHERE ${clause} ORDER BY ${order} LIMIT 24 OFFSET ?`,
      ...args,
      (page - 1) * 24,
    ),
    first<{ n: number }>(
      `SELECT COUNT(*) n FROM entities WHERE ${clause}`,
      ...args,
    ),
  ]);
  const items = concealAll(found, context);
  return {
    items,
    total: total?.n ?? 0,
    hidden: items.filter((i) => i.concealed).length,
  };
}

/**
 * A title-and-description filter must not become a spoiler oracle either: a
 * reader typing a hidden character's name should not learn that the name
 * matches something. Filtered listings exclude hidden rows in SQL; unfiltered
 * browsing retains concealed rows with explicit reveal controls.
 */
export const getEntity = (kind: string, slug: string) =>
  first<Entity>(
    "SELECT * FROM entities WHERE kind=? AND slug=? AND status='published'",
    kind,
    slug,
  );

export const getSources = (id: string) =>
  rows<Source>(
    "SELECT s.*,es.fact FROM sources s JOIN entity_sources es ON s.id=es.source_id WHERE es.entity_id=?",
    id,
  );

export const counts = () =>
  rows<{ kind: Kind; n: number }>(
    "SELECT kind,COUNT(*) n FROM entities WHERE status='published' GROUP BY kind",
  );

/** Raw full-text hits with no spoiler policy applied. Server use only. */
export async function searchAll(query: string) {
  const terms = query
    .trim()
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8);
  if (!terms?.length) return [];
  const match = terms.map((t) => `"${t}"*`).join(" AND ");
  return rows<Entity>(
    "SELECT e.* FROM entity_search s JOIN entities e ON e.rowid=s.rowid WHERE entity_search MATCH ? AND e.status='published' ORDER BY rank LIMIT 24",
    match,
  );
}

export async function search(
  query: string,
): Promise<{ items: Entity[]; hidden: number }> {
  const [found, context] = await Promise.all([
    searchAll(query),
    spoilerContext(),
  ]);
  return withheld(found, context);
}

/**
 * Related, neighbouring and recently viewed rails. Masked rather than dropped,
 * for the same reason listings are: a rail that silently shrinks reads as a
 * bug, and the reader keeps a control to lift the cover.
 */
export async function concealed(entities: Entity[]): Promise<EntityView[]> {
  return concealAll(entities, await spoilerContext());
}
